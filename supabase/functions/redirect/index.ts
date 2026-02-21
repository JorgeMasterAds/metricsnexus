import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get smart link and its active variants
  const { data: smartLink, error: slError } = await supabase
    .from('smart_links')
    .select('id, user_id, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (slError || !smartLink) {
    // Log redirect error
    console.error('Redirect error:', slError?.message || 'Smart Link not found', { slug });
    return new Response('Smart Link not found', { status: 404 });
  }

  const { data: variants, error: vError } = await supabase
    .from('variants')
    .select('id, url, weight')
    .eq('smart_link_id', smartLink.id)
    .eq('is_active', true);

  if (vError || !variants || variants.length === 0) {
    console.error('Redirect error: No active variants', { slug, smartLinkId: smartLink.id });
    return new Response('No active variants', { status: 404 });
  }

  // Weighted random selection
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedVariant = variants[0];
  for (const v of variants) {
    random -= v.weight;
    if (random <= 0) {
      selectedVariant = v;
      break;
    }
  }

  // Generate click_id
  const clickId = crypto.randomUUID().replace(/-/g, '');

  // Extract UTMs and metadata
  const utmSource = url.searchParams.get('utm_source') || null;
  const utmMedium = url.searchParams.get('utm_medium') || null;
  const utmCampaign = url.searchParams.get('utm_campaign') || null;
  const utmTerm = url.searchParams.get('utm_term') || null;
  const utmContent = url.searchParams.get('utm_content') || null;
  const referer = req.headers.get('referer') || null;
  const userAgent = req.headers.get('user-agent') || null;

  // Device detection
  let device = 'desktop';
  if (userAgent) {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'tablet';
    }
  }

  // Bot detection
  let isBot = false;
  if (userAgent) {
    const ua = userAgent.toLowerCase();
    isBot = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview/i.test(ua);
  }

  // IP hash
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 'unknown';
  const ipHash = await hashString(clientIp);

  // Deduplication: check if same ip+user_agent combo in last 3 seconds
  const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();
  const uaHash = userAgent ? await hashString(userAgent) : 'unknown';
  const dedupKey = `${ipHash}_${uaHash}`;
  
  const { data: recentView } = await supabase
    .from('views')
    .select('id')
    .eq('ip_hash', ipHash)
    .eq('variant_id', selectedVariant.id)
    .gte('created_at', threeSecondsAgo)
    .maybeSingle();

  if (!recentView) {
    // Insert view
    supabase.from('views').insert({
      click_id: clickId,
      smart_link_id: smartLink.id,
      variant_id: selectedVariant.id,
      user_id: smartLink.user_id,
      ip_hash: ipHash,
      user_agent: userAgent,
      referer: referer,
      device: device,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
    }).then(() => {});
  }

  // Build redirect URL preserving UTMs and adding click_id + utm_term
  const destinationUrl = new URL(selectedVariant.url);
  if (utmSource) destinationUrl.searchParams.set('utm_source', utmSource);
  if (utmMedium) destinationUrl.searchParams.set('utm_medium', utmMedium);
  if (utmCampaign) destinationUrl.searchParams.set('utm_campaign', utmCampaign);
  if (utmContent) destinationUrl.searchParams.set('utm_content', utmContent);
  // Set utm_term to click_id for attribution
  destinationUrl.searchParams.set('utm_term', clickId);
  destinationUrl.searchParams.set('click_id', clickId);
  destinationUrl.searchParams.set('sck', clickId);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': destinationUrl.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
});

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}
