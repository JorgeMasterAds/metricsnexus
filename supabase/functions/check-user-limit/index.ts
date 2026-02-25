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

  try {
    const url = new URL(req.url);
    const checkType = url.searchParams.get('check') || 'register';

    // Registration limit check - no auth required
    if (checkType === 'register') {
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('max_free_users')
        .eq('id', 'global')
        .single();

      const maxUsers = settings?.max_free_users || 100;

      // Count total users in the system using auth admin API
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1, page: 1 });
      
      // Use a count query on profiles as a proxy (more reliable)
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      const currentUsers = count || 0;

      return new Response(JSON.stringify({ 
        canRegister: currentUsers < maxUsers, 
        maxUsers,
        currentUsers 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All other checks require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if super_admin - bypass all limits
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id });
    if (isSuperAdmin) {
      return new Response(JSON.stringify({ canCreate: true, isSuperAdmin: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's account
    const { data: accountIds } = await supabase.rpc('get_user_account_ids', { _user_id: user.id });
    if (!accountIds || accountIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Sem conta vinculada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const accountId = accountIds[0];

    // Get usage limits for the account
    const { data: limits } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!limits) {
      return new Response(JSON.stringify({ error: 'Limites não encontrados' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (checkType === 'projects') {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId);
      const current = count || 0;
      const max = limits.max_projects || 1;
      return new Response(JSON.stringify({ canCreate: current < max, current, max }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (checkType === 'smartlinks') {
      const { count } = await supabase
        .from('smartlinks')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId);
      const current = count || 0;
      const max = limits.max_smartlinks || 1;
      return new Response(JSON.stringify({ canCreate: current < max, current, max }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (checkType === 'webhooks') {
      const { count } = await supabase
        .from('webhooks')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId);
      const current = count || 0;
      const max = limits.max_webhooks || 1;
      return new Response(JSON.stringify({ canCreate: max === -1 || current < max, current, max }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (checkType === 'users') {
      const { count } = await supabase
        .from('account_users')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId);
      const current = count || 0;
      const max = limits.max_users || 1;
      return new Response(JSON.stringify({ canCreate: current < max, current, max }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Tipo de verificação inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
