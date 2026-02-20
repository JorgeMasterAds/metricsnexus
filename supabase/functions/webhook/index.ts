import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hotmart-hottok, x-cakto-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
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

  const url = new URL(req.url);
  const platformParam = url.searchParams.get('platform') || '';

  // Detect platform
  let platform = platformParam.toLowerCase();
  if (!platform) {
    // Auto-detect from payload structure
    if (rawPayload.data && (rawPayload as any).data?.purchase) {
      platform = 'hotmart';
    } else if ((rawPayload as any).data?.amount !== undefined) {
      platform = 'cakto';
    } else {
      platform = 'unknown';
    }
  }

  let logEntry: Record<string, unknown> = {
    platform,
    raw_payload: rawPayload,
    status: 'received',
  };

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

  // Find user_id from smart_link or variant for webhook log attribution
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

async function processHotmart(payload: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const data = payload as any;
  const event = data.event;

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

  // Extract click_id for attribution
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

  if (event !== 'purchase_approved' && status !== 'paid') {
    const ignoreStatuses = ['refunded', 'canceled', 'chargedback'];
    if (ignoreStatuses.includes(status)) {
      return {
        event_type: event,
        status: 'ignored',
        ignore_reason: `Status ${status} is ignored`,
      };
    }
    if (event && event !== 'purchase_approved') {
      return {
        event_type: event,
        status: 'ignored',
        ignore_reason: `Event ${event} is not purchase_approved`,
      };
    }
  }

  const orderData = data.data || data;
  const transactionId = orderData.id;
  const amount = (orderData.amount || 0) / 100; // Cakto sends in cents
  const currency = orderData.offer?.currency || 'BRL';
  const productName = orderData.product?.name || 'Unknown';
  const paidAt = orderData.paidAt ? new Date(orderData.paidAt).toISOString() : new Date().toISOString();
  const isOrderBump = orderData.offer_type && orderData.offer_type !== 'main';

  if (!transactionId) {
    return { event_type: event, status: 'error', ignore_reason: 'Missing transaction id' };
  }

  // Extract click_id
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
    (data as any).utm_content,
    (data as any).sck,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}
