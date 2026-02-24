import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let dbStatus = 'ok';
  let dbError: string | null = null;
  let lastErrorTimestamp: string | null = null;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: dbErr } = await supabase.from('profiles').select('id').limit(1);
    if (dbErr) {
      dbStatus = 'error';
      dbError = dbErr.message;
    }

    const { data: recentErrors } = await supabase
      .from('webhook_logs')
      .select('created_at')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentErrors && recentErrors.length > 0) {
      lastErrorTimestamp = recentErrors[0].created_at;
    }
  } catch (e) {
    dbStatus = 'error';
    dbError = e instanceof Error ? e.message : String(e);
  }

  const uptime = Date.now() - startTime;

  return new Response(JSON.stringify({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    db: dbStatus,
    uptime_ms: uptime,
    last_error_timestamp: lastErrorTimestamp,
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    ...(dbError ? { db_error: dbError } : {}),
  }), {
    status: dbStatus === 'ok' ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
