import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { domain_id } = await req.json();
    if (!domain_id) {
      return new Response(JSON.stringify({ error: 'domain_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get domain record
    const { data: domainRecord, error: domainError } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', domain_id)
      .single();

    if (domainError || !domainRecord) {
      return new Response(JSON.stringify({ error: 'Domínio não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this account
    const { data: accountIds } = await supabase.rpc('get_user_account_ids', { _user_id: user.id });
    if (!accountIds || !accountIds.includes(domainRecord.account_id)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const domain = domainRecord.domain;
    const expectedTarget = 'fnpmuffrqrlofjvqytof.supabase.co';

    // DNS lookup via DNS-over-HTTPS (Cloudflare)
    let verified = false;
    let dnsMessage = '';

    try {
      const dnsRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const dnsData = await dnsRes.json();

      if (dnsData.Answer && dnsData.Answer.length > 0) {
        const cnameRecords = dnsData.Answer.filter((a: any) => a.type === 5);
        for (const record of cnameRecords) {
          const target = (record.data || '').replace(/\.$/, '').toLowerCase();
          if (target === expectedTarget) {
            verified = true;
            break;
          }
        }
        if (!verified) {
          // Also check A records as fallback (maybe CNAME resolved)
          const aRecords = dnsData.Answer.filter((a: any) => a.type === 1);
          if (aRecords.length > 0) {
            dnsMessage = `DNS aponta para ${aRecords.map((r: any) => r.data).join(', ')} em vez de CNAME para ${expectedTarget}`;
          } else {
            dnsMessage = `CNAME encontrado mas aponta para ${cnameRecords.map((r: any) => (r.data || '').replace(/\.$/, '')).join(', ')} em vez de ${expectedTarget}`;
          }
        }
      } else {
        dnsMessage = 'Nenhum registro CNAME encontrado para este domínio. Verifique a configuração DNS.';
      }
    } catch (dnsErr) {
      dnsMessage = `Erro ao consultar DNS: ${dnsErr.message}`;
    }

    if (verified) {
      // Update domain as verified and active
      await supabase
        .from('custom_domains')
        .update({ is_verified: true, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', domain_id);

      return new Response(JSON.stringify({
        verified: true,
        message: `Domínio ${domain} verificado com sucesso! Seus Smart Links agora usarão este domínio.`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        verified: false,
        message: dnsMessage || `O CNAME de ${domain} ainda não aponta para ${expectedTarget}. Aguarde a propagação DNS (até 72h).`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
