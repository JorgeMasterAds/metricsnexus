import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error('Usuário não autenticado');

    const { priceId, referralCode } = await req.json();
    if (!priceId) throw new Error('priceId é obrigatório');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-08-27.basil' });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Build metadata
    const metadata: Record<string, string> = { user_id: user.id };

    // If referral code provided, look up the referrer's Stripe Connect account
    let transferData: Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined;

    if (referralCode) {
      const { data: refCode } = await supabaseAdmin
        .from('referral_codes')
        .select('id, account_id, is_active')
        .eq('code', referralCode)
        .eq('is_active', true)
        .maybeSingle();

      if (refCode) {
        // Get referrer's Stripe Connect account
        const { data: referrerAccount } = await supabaseAdmin
          .from('accounts')
          .select('stripe_connect_account_id, stripe_connect_status')
          .eq('id', refCode.account_id)
          .single();

        if (referrerAccount?.stripe_connect_account_id && referrerAccount.stripe_connect_status === 'active') {
          metadata.referral_code_id = refCode.id;
          metadata.referrer_account_id = refCode.account_id;
          metadata.referrer_connect_id = referrerAccount.stripe_connect_account_id;
        }
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/settings?tab=subscription&checkout=success`,
      cancel_url: `${origin}/settings?tab=subscription&checkout=cancel`,
      metadata,
      subscription_data: {
        metadata,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[create-checkout] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
