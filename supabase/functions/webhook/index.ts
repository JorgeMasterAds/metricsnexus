import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const sanitizeString = (val: unknown, maxLen = 500): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return String(val).slice(0, maxLen);
  return val.slice(0, maxLen);
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

// ── PLATFORM NORMALIZERS ──

interface NormalizedSale {
  transactionId: string;
  refId: string | null;
  amount: number;
  baseAmount: number;
  fees: number;
  netAmount: number;
  currency: string;
  productName: string;
  externalProductId: string | null;
  paidAt: string;
  isOrderBump: boolean;
  status: string;
  paymentMethod: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  clickId: string | null;
  eventType: string;
  customerEmail: string | null;
  orderBumps: Array<{ name: string; amount: number }>;
}

const STATUS_MAP: Record<string, string> = {
  'approved': 'approved',
  'paid': 'approved',
  'completed': 'approved',
  'refunded': 'refunded',
  'canceled': 'canceled',
  'cancelled': 'canceled',
  'expired': 'canceled',
  'chargedback': 'chargedback',
  'chargeback': 'chargedback',
  'dispute': 'chargedback',
};

function normalizeStatus(event: string | null, status: string | null): string {
  // Check event first
  if (event) {
    const evLower = event.toLowerCase();
    if (evLower.includes('refund')) return 'refunded';
    if (evLower.includes('chargeback')) return 'chargedback';
    if (evLower.includes('cancel') || evLower.includes('expired')) return 'canceled';
    if (evLower.includes('approved') || evLower.includes('paid') || evLower.includes('completed')) return 'approved';
  }
  if (status) {
    const sLower = status.toLowerCase();
    return STATUS_MAP[sLower] || 'received';
  }
  return 'received';
}

/** Parse amount: NEVER divide by 100 if value looks like decimal (has fractional part or < 1000 for small amounts) */
function parseAmount(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return 0;
  // Values are expected in decimal (e.g. 26.99), NOT in cents
  // Only divide by 100 if the value is clearly in cents (integer > 999)
  return num;
}

function extractUtms(data: any): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; utmContent: string | null; utmTerm: string | null } {
  // Try multiple locations where UTMs might be
  const sources = [data, data?.data, data?.data?.purchase, data?.data?.checkout];
  for (const src of sources) {
    if (!src) continue;
    const utmSource = src.utm_source || src.utmSource || src.src || null;
    if (utmSource) {
      return {
        utmSource: sanitizeString(utmSource, 200),
        utmMedium: sanitizeString(src.utm_medium || src.utmMedium || null, 200),
        utmCampaign: sanitizeString(src.utm_campaign || src.utmCampaign || null, 200),
        utmContent: sanitizeString(src.utm_content || src.utmContent || null, 200),
        utmTerm: sanitizeString(src.utm_term || src.utmTerm || src.sck || null, 200),
      };
    }
  }
  return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null };
}

function extractClickId(data: any): string | null {
  if (!data) return null;
  const sources = [data, data?.data, data?.data?.purchase, data?.data?.checkout];
  for (const src of sources) {
    if (!src) continue;
    const candidates = [src.click_id, src.utm_term, src.sck];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim()) return c.trim();
    }
  }
  return null;
}

/** Normalize sale from any platform payload */
function normalizeSale(payload: any): NormalizedSale | null {
  const data = payload.data || payload;
  const event = payload.event || data.event || data.status || null;
  const status = normalizeStatus(event, data.status);

  // ── CAKTO / Generic format: data.amount, data.product, data.customer ──
  if (data.amount !== undefined || data.baseAmount !== undefined) {
    const amount = parseAmount(data.amount);
    const baseAmount = parseAmount(data.baseAmount || data.amount);
    const fees = parseAmount(data.fees || 0);
    const discount = parseAmount(data.discount || 0);
    const netAmount = amount - fees;

    return {
      transactionId: sanitizeString(data.id || data.refId || data.transaction_id || '', 200) || '',
      refId: sanitizeString(data.refId || data.ref_id || null, 200),
      amount,
      baseAmount,
      fees,
      netAmount: netAmount > 0 ? netAmount : amount,
      currency: sanitizeString(data.currency || data.offer?.currency || 'BRL', 10) || 'BRL',
      productName: sanitizeString(data.product?.name || data.productName || 'Unknown', 300) || 'Unknown',
      externalProductId: data.product?.id ? sanitizeString(String(data.product.id), 100) : null,
      paidAt: data.paidAt ? new Date(data.paidAt).toISOString() : new Date().toISOString(),
      isOrderBump: data.offer_type ? data.offer_type !== 'main' : false,
      status,
      paymentMethod: sanitizeString(data.paymentMethodName || data.paymentMethod || data.payment_method || null, 100),
      ...extractUtms(payload),
      clickId: extractClickId(payload),
      eventType: sanitizeString(event, 100) || status,
      customerEmail: sanitizeString(data.customer?.email || null, 200),
      orderBumps: [],
    };
  }

  // ── HOTMART format: data.purchase, data.product ──
  const purchase = data.purchase;
  const product = data.product;
  if (purchase) {
    const amount = parseAmount(purchase.price?.value);
    const fees = parseAmount(purchase.price?.fees || 0);
    return {
      transactionId: sanitizeString(purchase.transaction, 200) || '',
      refId: sanitizeString(purchase.transaction, 200),
      amount,
      baseAmount: amount,
      fees,
      netAmount: amount - fees,
      currency: sanitizeString(purchase.price?.currency_value, 10) || 'BRL',
      productName: sanitizeString(product?.name, 300) || 'Unknown',
      externalProductId: product?.id ? sanitizeString(String(product.id), 100) : null,
      paidAt: purchase.order_date ? new Date(purchase.order_date).toISOString() : new Date().toISOString(),
      isOrderBump: purchase.order_bump?.is_order_bump === true,
      status,
      paymentMethod: sanitizeString(purchase.payment?.type || null, 100),
      ...extractUtms(payload),
      clickId: extractClickId(payload),
      eventType: sanitizeString(event, 100) || status,
      customerEmail: sanitizeString(data.buyer?.email || null, 200),
      orderBumps: (purchase.order_bump?.order_bump_items || []).map((b: any) => ({
        name: b.name || 'Order Bump',
        amount: parseAmount(b.price?.value || b.amount || 0),
      })),
    };
  }

  return null;
}

function detectPlatform(payload: Record<string, unknown>): string {
  const data = payload as any;
  if (data.event && typeof data.event === 'string' && data.event.startsWith('PURCHASE')) return 'hotmart';
  if (data.data?.purchase) return 'hotmart';
  if (data.data?.amount !== undefined || data.data?.baseAmount !== undefined) return 'cakto';
  if (data.event === 'purchase_approved' || data.data?.status === 'paid') return 'sale_platform';
  return 'unknown';
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

  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > 102400) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
    if (rawBody.length > 102400) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response('Failed to read body', { status: 400 });
  }

  let rawPayload: Record<string, unknown>;
  try {
    rawPayload = JSON.parse(rawBody);
    if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
      return new Response('Payload must be a JSON object', { status: 400 });
    }
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // ── TOKEN-BASED ROUTING ──
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const token = pathParts[pathParts.length - 1];

  let accountId: string | null = null;
  let webhookId: string | null = null;
  let projectId: string | null = null;
  let linkedProductIds: string[] = [];
  let webhookPlatform: string | null = null;

  if (token && token !== 'webhook') {
    const { data: webhook } = await supabase
      .from('webhooks')
      .select('id, account_id, is_active, platform, project_id')
      .eq('token', token)
      .maybeSingle();

    if (!webhook) {
      await supabase.from('webhook_logs').insert({
        platform: 'unknown',
        raw_payload: rawPayload,
        status: 'error',
        ignore_reason: 'Invalid webhook token',
      });
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!webhook.is_active) {
      await supabase.from('webhook_logs').insert({
        platform: webhook.platform || 'unknown',
        raw_payload: rawPayload,
        status: 'ignored',
        ignore_reason: 'Webhook is inactive',
        account_id: webhook.account_id,
        webhook_id: webhook.id,
        project_id: webhook.project_id,
      });
      return new Response(JSON.stringify({ error: 'Webhook inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    accountId = webhook.account_id;
    webhookId = webhook.id;
    projectId = webhook.project_id;
    webhookPlatform = webhook.platform;

    const { data: wpRows } = await supabase
      .from('webhook_products')
      .select('product_id')
      .eq('webhook_id', webhook.id);
    linkedProductIds = (wpRows || []).map((r: any) => r.product_id);

  } else {
    await supabase.from('webhook_logs').insert({
      platform: 'unknown',
      raw_payload: rawPayload,
      status: 'error',
      ignore_reason: 'No valid token in URL',
    });
    return new Response(JSON.stringify({ error: 'Missing authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const detectedPlatform = detectPlatform(rawPayload);
  const platform = webhookPlatform || detectedPlatform;

  // Try to normalize the sale
  const sale = normalizeSale(rawPayload);

  if (!sale) {
    const logEntry = {
      platform,
      raw_payload: rawPayload,
      status: 'ignored',
      ignore_reason: 'Unknown payload format',
      account_id: accountId,
      webhook_id: webhookId,
      project_id: projectId,
    };
    await supabase.from('webhook_logs').insert(logEntry);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if negative event
  const isNegative = ['refunded', 'chargedback', 'canceled'].includes(sale.status);

  if (isNegative && sale.transactionId) {
    // Update existing conversion
    await supabase.from('conversions').update({ status: sale.status }).eq('transaction_id', sale.transactionId);
    await supabase.from('conversion_events').insert({
      transaction_id: sale.transactionId,
      event_type: sale.status,
      account_id: accountId,
      raw_payload: rawPayload,
    });

    await supabase.from('webhook_logs').insert({
      platform,
      raw_payload: rawPayload,
      status: sale.status,
      event_type: sale.eventType,
      transaction_id: sale.transactionId,
      attributed_click_id: sale.clickId,
      is_attributed: !!sale.clickId,
      account_id: accountId,
      webhook_id: webhookId,
      project_id: projectId,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Not approved? Ignore
  if (sale.status !== 'approved') {
    await supabase.from('webhook_logs').insert({
      platform,
      raw_payload: rawPayload,
      status: 'ignored',
      event_type: sale.eventType,
      ignore_reason: `Not approved: ${sale.eventType}`,
      account_id: accountId,
      webhook_id: webhookId,
      project_id: projectId,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!sale.transactionId) {
    await supabase.from('webhook_logs').insert({
      platform,
      raw_payload: rawPayload,
      status: 'error',
      event_type: sale.eventType,
      ignore_reason: 'Missing transaction id',
      account_id: accountId,
      webhook_id: webhookId,
      project_id: projectId,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate product linkage
  if (linkedProductIds.length > 0 && sale.externalProductId && accountId) {
    const { data: matchedProduct } = await supabase
      .from('products')
      .select('id')
      .eq('account_id', accountId)
      .eq('external_id', sale.externalProductId)
      .in('id', linkedProductIds)
      .maybeSingle();

    if (!matchedProduct) {
      await supabase.from('webhook_logs').insert({
        platform,
        raw_payload: rawPayload,
        status: 'ignored',
        event_type: sale.eventType,
        transaction_id: sale.transactionId,
        ignore_reason: `Product ${sale.externalProductId} not linked to this webhook`,
        account_id: accountId,
        webhook_id: webhookId,
        project_id: projectId,
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Deduplication
  const { data: existing } = await supabase.from('conversions').select('id').eq('transaction_id', sale.transactionId).maybeSingle();
  if (existing) {
    await supabase.from('webhook_logs').insert({
      platform,
      raw_payload: rawPayload,
      status: 'duplicate',
      event_type: sale.eventType,
      transaction_id: sale.transactionId,
      ignore_reason: 'Duplicate',
      attributed_click_id: sale.clickId,
      is_attributed: !!sale.clickId,
      account_id: accountId,
      webhook_id: webhookId,
      project_id: projectId,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Attribute via click
  let smartlinkId = null, variantId = null;
  if (sale.clickId) {
    const { data: click } = await supabase.from('clicks').select('smartlink_id, variant_id, account_id, project_id').eq('click_id', sale.clickId).maybeSingle();
    if (click) {
      smartlinkId = click.smartlink_id;
      variantId = click.variant_id;
      if (!projectId) projectId = click.project_id;
      if (!accountId) accountId = click.account_id;
    }
  }

  // If still no project_id, use webhook's project
  if (!projectId && webhookId) {
    const { data: wh } = await supabase.from('webhooks').select('project_id').eq('id', webhookId).maybeSingle();
    if (wh?.project_id) projectId = wh.project_id;
  }

  // Insert conversion with UTMs, payment, fees
  const { data: convRow } = await supabase.from('conversions').insert({
    account_id: accountId,
    project_id: projectId,
    click_id: sale.clickId,
    smartlink_id: smartlinkId,
    variant_id: variantId,
    transaction_id: sale.transactionId,
    ref_id: sale.refId,
    platform,
    product_name: sale.productName,
    amount: sale.amount,
    fees: sale.fees,
    net_amount: sale.netAmount,
    currency: sale.currency,
    is_order_bump: sale.isOrderBump,
    status: 'approved',
    paid_at: sale.paidAt,
    payment_method: sale.paymentMethod,
    utm_source: sale.utmSource,
    utm_medium: sale.utmMedium,
    utm_campaign: sale.utmCampaign,
    utm_content: sale.utmContent,
    utm_term: sale.utmTerm,
    raw_payload: rawPayload,
  }).select('id').single();

  if (convRow) {
    const items: Array<Record<string, unknown>> = [{
      conversion_id: convRow.id,
      account_id: accountId,
      product_name: sale.productName,
      amount: sale.amount,
      is_order_bump: sale.isOrderBump,
    }];

    for (const bump of sale.orderBumps) {
      items.push({
        conversion_id: convRow.id,
        account_id: accountId,
        product_name: bump.name,
        amount: bump.amount,
        is_order_bump: true,
      });
    }
    await supabase.from('conversion_items').insert(items);
  }

  await supabase.from('conversion_events').insert({
    transaction_id: sale.transactionId,
    event_type: 'approved',
    account_id: accountId,
    raw_payload: rawPayload,
  });

  // Log
  await supabase.from('webhook_logs').insert({
    platform,
    raw_payload: rawPayload,
    status: 'approved',
    event_type: sale.eventType,
    transaction_id: sale.transactionId,
    attributed_click_id: sale.clickId,
    is_attributed: !!sale.clickId,
    account_id: accountId,
    webhook_id: webhookId,
    project_id: projectId,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
