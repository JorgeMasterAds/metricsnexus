import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hotmart-hottok, x-cakto-secret',
};

// Simple in-memory rate limiting
const ipRequests = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // max requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let rawPayload: Record<string, unknown>;
  try {
    rawPayload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Auto-detect platform from payload structure
  const platform = detectPlatform(rawPayload);

  let logEntry: Record<string, unknown> = {
    platform,
    raw_payload: rawPayload,
    status: 'received',
  };

  // Validate webhook secret per platform
  const secretValid = await validateSecret(platform, req, supabase);
  if (secretValid === false) {
    logEntry.status = 'error';
    logEntry.ignore_reason = 'Invalid webhook secret';
    await supabase.from('webhook_logs').insert(logEntry);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (platform === 'hotmart') {
    const result = await processHotmart(rawPayload, supabase);
    logEntry = { ...logEntry, ...result };
  } else if (platform === 'cakto') {
    const result = await processCakto(rawPayload, supabase);
    logEntry = { ...logEntry, ...result };
  } else {
    logEntry.status = 'ignored';
    logEntry.ignore_reason = 'Unknown platform';
  }

  // Find user_id from view for webhook log attribution
  if (logEntry.attributed_click_id) {
    const { data: view } = await supabase
      .from('views')
      .select('user_id, smart_link_id, variant_id')
      .eq('click_id', logEntry.attributed_click_id)
      .maybeSingle();
    if (view) {
      logEntry.user_id = view.user_id;
      logEntry.attributed_variant_id = view.variant_id;
    }
  }

  await supabase.from('webhook_logs').insert(logEntry);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function detectPlatform(payload: Record<string, unknown>): string {
  const data = payload as any;
  // Hotmart: has event like PURCHASE_APPROVED and data.purchase
  if (data.event && typeof data.event === 'string' && data.event.startsWith('PURCHASE')) {
    return 'hotmart';
  }
  if (data.data?.purchase) {
    return 'hotmart';
  }
  // Cakto: has data.amount or event=purchase_approved (lowercase)
  if (data.event === 'purchase_approved' || data.data?.status === 'paid' || data.data?.amount !== undefined) {
    return 'cakto';
  }
  return 'unknown';
}

async function validateSecret(
  platform: string,
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<boolean | null> {
  // Get all profiles with secrets configured (we check against the user who owns the attributed click)
  // For now, validate against header if present
  if (platform === 'hotmart') {
    const hottok = req.headers.get('x-hotmart-hottok');
    if (!hottok) return null; // No secret sent, allow (optional validation)
    // Check if any user has this secret
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('hotmart_webhook_secret', hottok)
      .maybeSingle();
    return !!data;
  }
  if (platform === 'cakto') {
    const secret = req.headers.get('x-cakto-secret');
    if (!secret) return null;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('cakto_webhook_secret', secret)
      .maybeSingle();
    return !!data;
  }
  return null;
}

async function processHotmart(payload: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const data = payload as any;
  const event = data.event;

  // Handle negative events (update existing conversion status)
  const negativeEvents: Record<string, string> = {
    'PURCHASE_REFUNDED': 'refunded',
    'PURCHASE_CHARGEBACK': 'chargedback',
    'PURCHASE_CANCELED': 'canceled',
    'PURCHASE_EXPIRED': 'canceled',
  };

  if (negativeEvents[event]) {
    const purchase = data.data?.purchase;
    if (purchase?.transaction) {
      await supabase
        .from('conversions')
        .update({ status: negativeEvents[event] })
        .eq('transaction_id', purchase.transaction);
    }
    return {
      event_type: event,
      transaction_id: purchase?.transaction,
      status: negativeEvents[event],
      attributed_click_id: extractClickId(purchase || {}),
      is_attributed: !!extractClickId(purchase || {}),
    };
  }

  if (event !== 'PURCHASE_APPROVED') {
    return {
      event_type: event,
      status: 'ignored',
      ignore_reason: `Event ${event} is not PURCHASE_APPROVED`,
    };
  }

  const purchase = data.data?.purchase;
  const product = data.data?.product;

  if (!purchase) {
    return { event_type: event, status: 'error', ignore_reason: 'Missing purchase data' };
  }

  const transactionId = purchase.transaction;
  const amount = purchase.price?.value || 0;
  const currency = purchase.price?.currency_value || 'BRL';
  const productName = product?.name || 'Unknown';
  const orderDate = purchase.order_date ? new Date(purchase.order_date).toISOString() : new Date().toISOString();
  const isOrderBump = purchase.order_bump?.is_order_bump === true;

  const clickId = extractClickId(purchase);

  // Check duplicate
  const { data: existing } = await supabase
    .from('conversions')
    .select('id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (existing) {
    return {
      event_type: event,
      transaction_id: transactionId,
      status: 'duplicate',
      ignore_reason: 'Duplicate transaction_id',
      attributed_click_id: clickId,
      is_attributed: !!clickId,
    };
  }

  // Find view for attribution and inherit UTMs
  let smartLinkId = null;
  let variantId = null;
  let userId = null;
  if (clickId) {
    const { data: view } = await supabase
      .from('views')
      .select('smart_link_id, variant_id, user_id')
      .eq('click_id', clickId)
      .maybeSingle();
    if (view) {
      smartLinkId = view.smart_link_id;
      variantId = view.variant_id;
      userId = view.user_id;
    }
  }

  await supabase.from('conversions').insert({
    click_id: clickId,
    user_id: userId,
    smart_link_id: smartLinkId,
    variant_id: variantId,
    transaction_id: transactionId,
    platform: 'hotmart',
    product_name: productName,
    amount,
    currency,
    is_order_bump: isOrderBump,
    status: 'approved',
    paid_at: orderDate,
    raw_payload: payload,
  });

  return {
    event_type: event,
    transaction_id: transactionId,
    status: 'approved',
    attributed_click_id: clickId,
    is_attributed: !!clickId,
  };
}

async function processCakto(payload: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const data = payload as any;
  const event = data.event;
  const status = data.data?.status;

  // Handle negative statuses (update existing conversion)
  const negativeStatuses: Record<string, string> = {
    'refunded': 'refunded',
    'canceled': 'canceled',
    'chargedback': 'chargedback',
  };

  if (negativeStatuses[status]) {
    const orderData = data.data || data;
    const transactionId = orderData.id;
    if (transactionId) {
      await supabase
        .from('conversions')
        .update({ status: negativeStatuses[status] })
        .eq('transaction_id', String(transactionId));
    }
    return {
      event_type: event || status,
      transaction_id: transactionId ? String(transactionId) : null,
      status: negativeStatuses[status],
      attributed_click_id: extractClickId(orderData),
      is_attributed: !!extractClickId(orderData),
    };
  }

  if (event !== 'purchase_approved' && status !== 'paid') {
    return {
      event_type: event || status,
      status: 'ignored',
      ignore_reason: `Event/status not approved: ${event || status}`,
    };
  }

  const orderData = data.data || data;
  const transactionId = orderData.id;
  const amount = (orderData.amount || 0) / 100;
  const currency = orderData.offer?.currency || 'BRL';
  const productName = orderData.product?.name || 'Unknown';
  const paidAt = orderData.paidAt ? new Date(orderData.paidAt).toISOString() : new Date().toISOString();
  const isOrderBump = orderData.offer_type && orderData.offer_type !== 'main';

  if (!transactionId) {
    return { event_type: event, status: 'error', ignore_reason: 'Missing transaction id' };
  }

  const clickId = extractClickId(orderData);

  // Check duplicate
  const { data: existing } = await supabase
    .from('conversions')
    .select('id')
    .eq('transaction_id', String(transactionId))
    .maybeSingle();

  if (existing) {
    return {
      event_type: event,
      transaction_id: String(transactionId),
      status: 'duplicate',
      ignore_reason: 'Duplicate transaction_id',
      attributed_click_id: clickId,
      is_attributed: !!clickId,
    };
  }

  // Find view for attribution
  let smartLinkId = null;
  let variantId = null;
  let userId = null;
  if (clickId) {
    const { data: view } = await supabase
      .from('views')
      .select('smart_link_id, variant_id, user_id')
      .eq('click_id', clickId)
      .maybeSingle();
    if (view) {
      smartLinkId = view.smart_link_id;
      variantId = view.variant_id;
      userId = view.user_id;
    }
  }

  await supabase.from('conversions').insert({
    click_id: clickId,
    user_id: userId,
    smart_link_id: smartLinkId,
    variant_id: variantId,
    transaction_id: String(transactionId),
    platform: 'cakto',
    product_name: productName,
    amount,
    currency,
    is_order_bump: !!isOrderBump,
    status: 'approved',
    paid_at: paidAt,
    raw_payload: payload,
  });

  return {
    event_type: event,
    transaction_id: String(transactionId),
    status: 'approved',
    attributed_click_id: clickId,
    is_attributed: !!clickId,
  };
}

function extractClickId(data: Record<string, unknown>): string | null {
  if (!data) return null;
  const candidates = [
    (data as any).click_id,
    (data as any).utm_term,
    (data as any).sck,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}
