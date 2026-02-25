import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Não autorizado');

    const { email, project_id, role = 'member' } = await req.json();

    if (!email || !project_id) {
      return new Response(JSON.stringify({ error: 'Email e projeto são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Papel inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the project belongs to the caller's account
    const { data: accountIds } = await supabase.rpc('get_user_account_ids', { _user_id: userData.user.id });
    if (!accountIds || accountIds.length === 0) throw new Error('Conta não encontrada');

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, account_id')
      .eq('id', project_id)
      .in('account_id', accountIds)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Projeto não encontrado ou sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller is owner/admin of the account
    const isAdmin = await supabase.rpc('user_has_admin_access', {
      _user_id: userData.user.id,
      _account_id: project.account_id,
    });
    if (!isAdmin.data) {
      return new Response(JSON.stringify({ error: 'Apenas admins podem convidar membros' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check team member limit (1000 per project)
    const { count: memberCount } = await supabase
      .from('project_users')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id);

    if ((memberCount || 0) >= 1000) {
      return new Response(JSON.stringify({ error: 'Limite de 1000 membros por projeto atingido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find user by email using secure RPC (avoids loading all users)
    const { data: targetUserId } = await supabase.rpc('find_user_id_by_email', { _email: email });

    // Generic response to prevent email enumeration
    const genericSuccess = { success: true, message: 'Convite enviado se o usuário existir.' };

    if (!targetUserId) {
      // Return same response whether user exists or not
      return new Response(JSON.stringify(genericSuccess), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already a member (silent - same generic response)
    const { data: existing } = await supabase
      .from('project_users')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(genericSuccess), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add member
    const { error: insertError } = await supabase
      .from('project_users')
      .insert({
        project_id,
        user_id: targetUserId,
        role,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify(genericSuccess), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
