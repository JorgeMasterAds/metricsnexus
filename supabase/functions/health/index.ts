import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let dbStatus = 'ok';
  let dbError: string | null = null;
  let webhookStatus = 'ok';
  let lastErrorTimestamp: string | null = null;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check DB connectivity
    const { error: dbErr } = await supabase.from('profiles').select('id').limit(1);
    if (dbErr) {
      dbStatus = 'error';
      dbError = dbErr.message;
    }

    // Check webhook logs for recent errors
    const { data: recentErrors } = await supabase
      .from('webhook_logs')
      .select('created_at')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentErrors && recentErrors.length > 0) {
      lastErrorTimestamp = recentErrors[0].created_at;
    }

    // Check redirect errors
    const { data: redirectErrors } = await supabase
      .from('redirect_errors')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (redirectErrors && redirectErrors.length > 0) {
      const redirectLastError = redirectErrors[0].created_at;
      if (!lastErrorTimestamp || redirectLastError > lastErrorTimestamp) {
        lastErrorTimestamp = redirectLastError;
      }
    }
  } catch (e) {
    dbStatus = 'error';
    dbError = e instanceof Error ? e.message : String(e);
  }

  const uptime = Date.now() - startTime;

  return new Response(JSON.stringify({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    db: dbStatus,
    webhook: webhookStatus,
    uptime_ms: uptime,
    last_error_timestamp: lastErrorTimestamp,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    ...(dbError ? { db_error: dbError } : {}),
  }), {
    status: dbStatus === 'ok' ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
