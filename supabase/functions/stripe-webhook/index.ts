import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRODUCT_PLAN_MAP: Record<string, string> = {};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY não configurada' }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let event: Stripe.Event;
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error('Verificação de assinatura falhou:', err);
    return new Response(JSON.stringify({ error: 'Assinatura inválida' }), { status: 400 });
  }

  console.log(`[STRIPE-WEBHOOK] Processando evento: ${event.type}`);

  // Build product->plan map from DB
  const { data: plans } = await supabase.from('plans').select('name, stripe_product_id');
  if (plans) {
    for (const p of plans) {
      if (p.stripe_product_id) {
        PRODUCT_PLAN_MAP[p.stripe_product_id] = p.name;
      }
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (!customerEmail) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const productId = subscription.items.data[0]?.price?.product as string;
        const planType = PRODUCT_PLAN_MAP[productId] || 'bronze';

        // Find plan_id
        const { data: planRow } = await supabase.from('plans').select('id').eq('name', planType).maybeSingle();

        // Find user by email using secure RPC (avoids loading all users)
        const { data: userId } = await supabase.rpc('find_user_id_by_email', { _email: customerEmail });
        if (!userId) { console.error(`Usuário não encontrado: ${customerEmail}`); break; }

        const { data: accountIds } = await supabase.rpc('get_user_account_ids', { _user_id: userId });
        if (!accountIds || accountIds.length === 0) { console.error(`Sem conta para usuário: ${userId}`); break; }

        await supabase.from('subscriptions').upsert({
          account_id: accountIds[0],
          plan_type: planType,
          plan_id: planRow?.id || null,
          status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: 'account_id' });

        // Update usage_limits based on plan
        const { data: planLimits } = await supabase.from('plans').select('max_projects, max_smartlinks, max_webhooks, max_users').eq('name', planType).maybeSingle();
        if (planLimits) {
          await supabase.from('usage_limits').update({
            max_projects: planLimits.max_projects,
            max_smartlinks: planLimits.max_smartlinks,
            max_webhooks: planLimits.max_webhooks,
            max_users: planLimits.max_users,
          }).eq('account_id', accountIds[0]);
        }

        console.log(`[STRIPE-WEBHOOK] Assinatura criada para conta ${accountIds[0]}, plano: ${planType}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const productId = subscription.items.data[0]?.price?.product as string;
        const planType = PRODUCT_PLAN_MAP[productId] || 'bronze';
        const { data: planRow } = await supabase.from('plans').select('id').eq('name', planType).maybeSingle();

        await supabase.from('subscriptions').update({
          status: 'active',
          plan_type: planType,
          plan_id: planRow?.id || null,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('stripe_subscription_id', subscriptionId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;
        await supabase.from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', subscriptionId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: sub } = await supabase.from('subscriptions').select('account_id').eq('stripe_subscription_id', subscription.id).maybeSingle();
        
        await supabase.from('subscriptions').update({ 
          status: 'canceled', 
          plan_type: 'free',
        }).eq('stripe_subscription_id', subscription.id);

        // Reset limits to free plan
        if (sub?.account_id) {
          const { data: freePlan } = await supabase.from('plans').select('max_projects, max_smartlinks, max_webhooks, max_users').eq('name', 'free').maybeSingle();
          if (freePlan) {
            await supabase.from('usage_limits').update({
              max_projects: freePlan.max_projects,
              max_smartlinks: freePlan.max_smartlinks,
              max_webhooks: freePlan.max_webhooks,
              max_users: freePlan.max_users,
            }).eq('account_id', sub.account_id);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const productId = subscription.items.data[0]?.price?.product as string;
        const planType = PRODUCT_PLAN_MAP[productId] || 'bronze';
        const { data: planRow } = await supabase.from('plans').select('id, max_projects, max_smartlinks, max_webhooks, max_users').eq('name', planType).maybeSingle();

        const { data: sub } = await supabase.from('subscriptions').update({
          status: subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'canceled',
          plan_type: planType,
          plan_id: planRow?.id || null,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('stripe_subscription_id', subscription.id).select('account_id').maybeSingle();

        if (sub?.account_id && planRow) {
          await supabase.from('usage_limits').update({
            max_projects: planRow.max_projects,
            max_smartlinks: planRow.max_smartlinks,
            max_webhooks: planRow.max_webhooks,
            max_users: planRow.max_users,
          }).eq('account_id', sub.account_id);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[STRIPE-WEBHOOK] Erro ao processar ${event.type}:`, err);
    return new Response(JSON.stringify({ error: 'Falha no processamento' }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
