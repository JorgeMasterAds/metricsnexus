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
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-08-27.basil' });

  try {
    // Check auth - only super_admin can run this
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error('Não autorizado');
    
    const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: userData.user.id });
    if (!isAdmin) throw new Error('Apenas super_admin pode executar esta ação');

    const { data: plans } = await supabase.from('plans').select('*').order('price');
    if (!plans) throw new Error('Nenhum plano encontrado');

    const results = [];

    for (const plan of plans) {
      if (plan.name === 'free') continue;
      if (plan.stripe_product_id && plan.stripe_price_id) {
        results.push({ plan: plan.name, status: 'já existe', product_id: plan.stripe_product_id, price_id: plan.stripe_price_id });
        continue;
      }

      // Create Stripe product
      const product = await stripe.products.create({
        name: `Nexus Metrics - ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}`,
        description: (plan.features || []).join(', '),
        metadata: { plan_name: plan.name },
      });

      // Create Stripe price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price * 100),
        currency: 'brl',
        recurring: { interval: 'month' },
      });

      // Update plan with Stripe IDs
      await supabase.from('plans').update({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
      }).eq('id', plan.id);

      results.push({ plan: plan.name, status: 'criado', product_id: product.id, price_id: price.id });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[setup-stripe] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
