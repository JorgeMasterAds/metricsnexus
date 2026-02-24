import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
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

  // Get smartlink
  const { data: smartLink, error: slError } = await supabase
    .from('smartlinks')
    .select('id, account_id, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (slError || !smartLink) {
    return new Response('Smart Link not found', { status: 404 });
  }

  // Get active variants
  const { data: variants, error: vError } = await supabase
    .from('smartlink_variants')
    .select('id, url, weight')
    .eq('smartlink_id', smartLink.id)
    .eq('is_active', true);

  if (vError || !variants || variants.length === 0) {
    return new Response('No active variants', { status: 404 });
  }

  // Weighted random selection
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
  let random = Math.random() * totalWeight;
  let selectedVariant = variants[0];
  for (const v of variants) {
    random -= (v.weight || 1);
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
  const referrer = req.headers.get('referer') || null;
  const userAgent = req.headers.get('user-agent') || null;

  // Device detection
  let deviceType = 'desktop';
  if (userAgent) {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('x-real-ip') || null;

  // Country from Cloudflare header
  const country = req.headers.get('cf-ipcountry') || null;

  // Insert click (fire and forget)
  supabase.from('clicks').insert({
    account_id: smartLink.account_id,
    smartlink_id: smartLink.id,
    variant_id: selectedVariant.id,
    click_id: clickId,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: utmTerm,
    utm_content: utmContent,
    referrer,
    ip: clientIp,
    user_agent: userAgent,
    device_type: deviceType,
    country,
  }).then(() => {});

  // Build redirect URL
  let destinationUrl: URL;
  try {
    destinationUrl = new URL(selectedVariant.url);
    if (!['http:', 'https:'].includes(destinationUrl.protocol)) {
      return new Response('Invalid redirect URL protocol', { status: 400 });
    }
  } catch {
    return new Response('Invalid redirect URL', { status: 400 });
  }
  if (utmSource) destinationUrl.searchParams.set('utm_source', utmSource);
  if (utmMedium) destinationUrl.searchParams.set('utm_medium', utmMedium);
  if (utmCampaign) destinationUrl.searchParams.set('utm_campaign', utmCampaign);
  if (utmContent) destinationUrl.searchParams.set('utm_content', utmContent);
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
