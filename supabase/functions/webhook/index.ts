import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const ipRequests = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60000;

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

  // Validate x-webhook-secret header
  const webhookSecret = req.headers.get('x-webhook-secret');
  if (webhookSecret) {
    const { data: secretMatch } = await supabase
      .from('profiles')
      .select('id')
      .eq('webhook_secret', webhookSecret)
      .maybeSingle();
    
    if (!secretMatch) {
      const logEntry = {
        platform: 'unknown',
        raw_payload: rawPayload,
        status: 'error',
        ignore_reason: 'Invalid x-webhook-secret header',
      };
      await supabase.from('webhook_logs').insert(logEntry);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const platform = detectPlatform(rawPayload);

  let logEntry: Record<string, unknown> = {
    platform,
    raw_payload: rawPayload,
    status: 'received',
  };

  if (platform === 'sale_platform') {
    const result = await processSale(rawPayload, supabase);
    logEntry = { ...logEntry, ...result };
  } else {
    logEntry.status = 'ignored';
    logEntry.ignore_reason = 'Unknown platform or event format';
  }

  // Find user_id and project_id from view for webhook log attribution
  if (logEntry.attributed_click_id) {
    const { data: view } = await supabase
      .from('views')
      .select('user_id, smart_link_id, variant_id, project_id')
      .eq('click_id', logEntry.attributed_click_id)
      .maybeSingle();
    if (view) {
      logEntry.user_id = view.user_id;
      logEntry.attributed_variant_id = view.variant_id;
      logEntry.project_id = view.project_id;
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
  // Detect any sale platform
  if (data.event && typeof data.event === 'string' && data.event.startsWith('PURCHASE')) {
    return 'sale_platform';
  }
  if (data.data?.purchase) {
    return 'sale_platform';
  }
  if (data.event === 'purchase_approved' || data.data?.status === 'paid' || data.data?.amount !== undefined) {
    return 'sale_platform';
  }
  return 'unknown';
}

async function processSale(payload: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const data = payload as any;
  const event = data.event;

  const negativeEvents: Record<string, string> = {
    'PURCHASE_REFUNDED': 'refunded',
    'PURCHASE_CHARGEBACK': 'chargedback',
    'PURCHASE_CANCELED': 'canceled',
    'PURCHASE_EXPIRED': 'canceled',
  };

  const negativeStatuses: Record<string, string> = {
    'refunded': 'refunded',
    'canceled': 'canceled',
    'chargedback': 'chargedback',
  };

  // Check negative events (format 1)
  if (negativeEvents[event]) {
    const purchase = data.data?.purchase;
    const transactionId = purchase?.transaction;
    if (transactionId) {
      await supabase
        .from('conversions')
        .update({ status: negativeEvents[event] })
        .eq('transaction_id', transactionId);
      
      const clickId = extractClickId(purchase || {});
      let userId = null;
      if (clickId) {
        const { data: view } = await supabase.from('views').select('user_id').eq('click_id', clickId).maybeSingle();
        userId = view?.user_id || null;
      }
      await supabase.from('conversion_events').insert({
        transaction_id: transactionId,
        event_type: negativeEvents[event],
        user_id: userId,
        raw_payload: payload,
      });
    }
    return {
      event_type: event,
      transaction_id: transactionId,
      status: negativeEvents[event],
      attributed_click_id: extractClickId(purchase || {}),
      is_attributed: !!extractClickId(purchase || {}),
    };
  }

  // Check negative statuses (format 2)
  const status = data.data?.status;
  if (negativeStatuses[status]) {
    const orderData = data.data || data;
    const transactionId = orderData.id;
    if (transactionId) {
      await supabase
        .from('conversions')
        .update({ status: negativeStatuses[status] })
        .eq('transaction_id', String(transactionId));
      
      const clickId = extractClickId(orderData);
      let userId = null;
      if (clickId) {
        const { data: view } = await supabase.from('views').select('user_id').eq('click_id', clickId).maybeSingle();
        userId = view?.user_id || null;
      }
      await supabase.from('conversion_events').insert({
        transaction_id: String(transactionId),
        event_type: negativeStatuses[status],
        user_id: userId,
        raw_payload: payload,
      });
    }
    return {
      event_type: event || status,
      transaction_id: transactionId ? String(transactionId) : null,
      status: negativeStatuses[status],
      attributed_click_id: extractClickId(orderData),
      is_attributed: !!extractClickId(orderData),
    };
  }

  // Positive events
  const isApproved = event === 'PURCHASE_APPROVED' || event === 'purchase_approved' || status === 'paid';
  if (!isApproved) {
    return {
      event_type: event || status,
      status: 'ignored',
      ignore_reason: `Event/status not approved: ${event || status}`,
    };
  }

  // Extract sale data (supports multiple formats)
  const purchase = data.data?.purchase;
  const product = data.data?.product;
  const orderData = data.data || data;

  let transactionId: string;
  let amount: number;
  let currency: string;
  let productName: string;
  let paidAt: string;
  let isOrderBump: boolean;

  if (purchase) {
    // Format 1
    transactionId = purchase.transaction;
    amount = purchase.price?.value || 0;
    currency = purchase.price?.currency_value || 'BRL';
    productName = product?.name || 'Unknown';
    paidAt = purchase.order_date ? new Date(purchase.order_date).toISOString() : new Date().toISOString();
    isOrderBump = purchase.order_bump?.is_order_bump === true;
  } else {
    // Format 2
    transactionId = String(orderData.id || '');
    amount = (orderData.amount || 0) / 100;
    currency = orderData.offer?.currency || 'BRL';
    productName = orderData.product?.name || 'Unknown';
    paidAt = orderData.paidAt ? new Date(orderData.paidAt).toISOString() : new Date().toISOString();
    isOrderBump = orderData.offer_type && orderData.offer_type !== 'main';
  }

  if (!transactionId) {
    return { event_type: event, status: 'error', ignore_reason: 'Missing transaction id' };
  }

  const clickId = extractClickId(purchase || orderData);

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

  let smartLinkId = null;
  let variantId = null;
  let userId = null;
  let projectId = null;
  if (clickId) {
    const { data: view } = await supabase
      .from('views')
      .select('smart_link_id, variant_id, user_id, project_id')
      .eq('click_id', clickId)
      .maybeSingle();
    if (view) {
      smartLinkId = view.smart_link_id;
      variantId = view.variant_id;
      userId = view.user_id;
      projectId = view.project_id;
    }
  }

  await supabase.from('conversions').insert({
    click_id: clickId,
    user_id: userId,
    smart_link_id: smartLinkId,
    variant_id: variantId,
    project_id: projectId,
    transaction_id: transactionId,
    platform: 'sale_platform',
    product_name: productName,
    amount,
    currency,
    is_order_bump: !!isOrderBump,
    status: 'approved',
    paid_at: paidAt,
    raw_payload: payload,
  });

  // Audit log
  await supabase.from('conversion_events').insert({
    transaction_id: transactionId,
    event_type: 'approved',
    user_id: userId,
    project_id: projectId,
    raw_payload: payload,
  });

  // Update daily metrics
  if (userId && smartLinkId && variantId) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existingMetric } = await supabase
      .from('daily_metrics')
      .select('id, conversions, revenue')
      .eq('date', today)
      .eq('user_id', userId)
      .eq('smart_link_id', smartLinkId)
      .eq('variant_id', variantId)
      .maybeSingle();
    
    if (existingMetric) {
      await supabase.from('daily_metrics').update({
        conversions: existingMetric.conversions + 1,
        revenue: Number(existingMetric.revenue) + Number(amount),
      }).eq('id', existingMetric.id);
    } else {
      await supabase.from('daily_metrics').insert({
        date: today,
        user_id: userId,
        smart_link_id: smartLinkId,
        variant_id: variantId,
        project_id: projectId,
        conversions: 1,
        revenue: amount,
      });
    }
  }

  return {
    event_type: event,
    transaction_id: transactionId,
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
