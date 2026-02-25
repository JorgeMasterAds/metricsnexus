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
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-08-27.basil' });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Não autorizado');

    const { data: accountIds } = await supabase.rpc('get_user_account_ids', { _user_id: userData.user.id });
    if (!accountIds || accountIds.length === 0) throw new Error('Sem conta');
    const accountId = accountIds[0];

    // Check if account already has a connect account
    const { data: account } = await supabase
      .from('accounts')
      .select('stripe_connect_account_id, stripe_connect_status, name')
      .eq('id', accountId)
      .single();

    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const { action } = await req.json().catch(() => ({ action: 'onboard' }));

    // If action is 'status', just return the current status
    if (action === 'status') {
      if (account?.stripe_connect_account_id) {
        try {
          const connectAccount = await stripe.accounts.retrieve(account.stripe_connect_account_id);
          const isComplete = connectAccount.charges_enabled && connectAccount.payouts_enabled;
          const newStatus = isComplete ? 'active' : 'pending';

          if (newStatus !== account.stripe_connect_status) {
            await supabase.from('accounts').update({ stripe_connect_status: newStatus }).eq('id', accountId);
          }

          return new Response(JSON.stringify({
            status: newStatus,
            charges_enabled: connectAccount.charges_enabled,
            payouts_enabled: connectAccount.payouts_enabled,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch {
          return new Response(JSON.stringify({ status: 'pending' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      return new Response(JSON.stringify({ status: 'not_started' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let connectAccountId = account?.stripe_connect_account_id;

    if (!connectAccountId) {
      // Create a new Stripe Connect Express account
      const connectAccount = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email: userData.user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: account?.name || 'Afiliado',
        },
        metadata: {
          account_id: accountId,
          user_id: userData.user.id,
        },
      });

      connectAccountId = connectAccount.id;

      await supabase.from('accounts').update({
        stripe_connect_account_id: connectAccountId,
        stripe_connect_status: 'pending',
      }).eq('id', accountId);
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${origin}/settings?tab=referrals&connect=refresh`,
      return_url: `${origin}/settings?tab=referrals&connect=complete`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[connect-onboarding] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
