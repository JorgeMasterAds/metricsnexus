import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token, x-reprocess-log-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    // Only extract actual click_id or sck (which IS the click_id)
    // Do NOT use utm_term here — utm_term is a separate fallback for attribution
    const candidates = [src.click_id, src.sck];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim()) return c.trim();
    }
  }
  return null;
}

/** Extract utm_term separately for fallback attribution */
function extractUtmTermForAttribution(data: any): string | null {
  if (!data) return null;
  const sources = [data, data?.data, data?.data?.purchase, data?.data?.checkout];
  for (const src of sources) {
    if (!src) continue;
    const val = src.utm_term || src.utmTerm;
    if (val && typeof val === 'string' && val.trim()) return val.trim();
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

  // Reprocess mode: update existing log instead of creating new one
  const reprocessLogId = req.headers.get('x-reprocess-log-id');

  async function upsertLog(logData: Record<string, unknown>) {
    if (reprocessLogId) {
      await supabase.from('webhook_logs').update(logData).eq('id', reprocessLogId);
    } else {
      await supabase.from('webhook_logs').insert(logData);
    }
  }

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

  // ── JSON COMPLEXITY VALIDATION ──
  function validateJsonComplexity(obj: unknown, depth = 0, totalKeys = { count: 0 }): boolean {
    if (depth > 10) return false;
    if (totalKeys.count > 200) return false;
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      if (keys.length > 50) return false;
      totalKeys.count += keys.length;
      for (const key of keys) {
        if (!validateJsonComplexity((obj as Record<string, unknown>)[key], depth + 1, totalKeys)) return false;
      }
    }
    return true;
  }

  if (!validateJsonComplexity(rawPayload)) {
    return new Response(JSON.stringify({ error: 'Payload too complex' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
      await upsertLog({
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
      return new Response(JSON.stringify({ error: 'Webhook inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    accountId = webhook.account_id;
    webhookId = webhook.id;
    projectId = webhook.project_id;
    webhookPlatform = webhook.platform;

    // Check if project is active — skip processing entirely if inactive
    if (projectId) {
      const { data: proj } = await supabase
        .from('projects')
        .select('is_active')
        .eq('id', projectId)
        .maybeSingle();
      if (proj && !proj.is_active) {
        return new Response(JSON.stringify({ ok: true, skipped: 'project_inactive' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: wpRows } = await supabase
      .from('webhook_products')
      .select('product_id')
      .eq('webhook_id', webhook.id);
    linkedProductIds = (wpRows || []).map((r: any) => r.product_id);

  } else {
    return new Response(JSON.stringify({ error: 'Missing authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── NORMALIZE: Cakto can send data as array — use first item ──
  if (Array.isArray((rawPayload as any).data)) {
    const dataArr = (rawPayload as any).data;
    if (dataArr.length > 0) {
      (rawPayload as any).data = dataArr[0];
      console.log(`[WEBHOOK] Normalized data[] (${dataArr.length} items) → object`);
    }
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
    await upsertLog(logEntry);
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

    await upsertLog({
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
    await upsertLog({
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
    await upsertLog({
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
      await upsertLog({
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
    await upsertLog({
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

  // ── ATTRIBUTION: click_id (priority) → utm_term (fallback) ──
  let smartlinkId = null, variantId = null;
  let attributedClickId = sale.clickId;
  let isAttributed = false;

  // Priority 1: Direct click_id match
  if (sale.clickId) {
    const { data: click } = await supabase.from('clicks')
      .select('smartlink_id, variant_id, account_id, project_id')
      .eq('click_id', sale.clickId)
      .maybeSingle();
    if (click) {
      smartlinkId = click.smartlink_id;
      variantId = click.variant_id;
      if (!projectId) projectId = click.project_id;
      if (!accountId) accountId = click.account_id;
      isAttributed = true;
    }
  }

  // Priority 2: Fallback via utm_term (when click_id is absent or not found)
  if (!isAttributed) {
    const utmTermFallback = extractUtmTermForAttribution(rawPayload);
    if (utmTermFallback) {
      // Look up click by utm_term value matching click_id in clicks table
      // (the redirect function sets click_id as utm_term for platforms that strip custom params)
      const { data: clickByTerm } = await supabase.from('clicks')
        .select('click_id, smartlink_id, variant_id, account_id, project_id')
        .eq('click_id', utmTermFallback)
        .maybeSingle();
      
      if (clickByTerm) {
        smartlinkId = clickByTerm.smartlink_id;
        variantId = clickByTerm.variant_id;
        attributedClickId = clickByTerm.click_id;
        if (!projectId) projectId = clickByTerm.project_id;
        if (!accountId) accountId = clickByTerm.account_id;
        isAttributed = true;
      } else if (accountId) {
        // Fallback: try matching utm_term against the utm_term column in clicks
        // (for cases where utm_term was set independently, find the most recent matching click)
        const { data: clickByUtm } = await supabase.from('clicks')
          .select('click_id, smartlink_id, variant_id, account_id, project_id')
          .eq('account_id', accountId)
          .eq('utm_term', utmTermFallback)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (clickByUtm) {
          smartlinkId = clickByUtm.smartlink_id;
          variantId = clickByUtm.variant_id;
          attributedClickId = clickByUtm.click_id;
          if (!projectId) projectId = clickByUtm.project_id;
          isAttributed = true;
        }
      }
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
    click_id: attributedClickId || sale.clickId,
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

    // Upsert lead from webhook data
    const customerData = (rawPayload as any).data?.customer || (rawPayload as any).data?.buyer || {};
    const customerName = sanitizeString(customerData.name || customerData.full_name || sale.customerEmail || '', 200);
    const customerPhone = sanitizeString(customerData.phone_number || customerData.phone || customerData.cel || '', 50);
    
    await supabase.rpc('upsert_lead_from_webhook', {
      p_account_id: accountId,
      p_project_id: projectId,
      p_name: customerName || sale.customerEmail || 'Lead',
      p_email: sale.customerEmail,
      p_phone: customerPhone,
      p_source: platform,
      p_amount: sale.amount,
      p_conversion_id: convRow.id,
      p_product_name: sale.productName,
      p_status: sale.status,
      p_payment_method: sale.paymentMethod,
      p_utm_source: sale.utmSource,
      p_utm_medium: sale.utmMedium,
      p_utm_campaign: sale.utmCampaign,
    });
  }

  await supabase.from('conversion_events').insert({
    transaction_id: sale.transactionId,
    event_type: 'approved',
    account_id: accountId,
    raw_payload: rawPayload,
  });

  // Log
  await upsertLog({
    platform,
    raw_payload: rawPayload,
    status: 'approved',
    event_type: sale.eventType,
    transaction_id: sale.transactionId,
    attributed_click_id: attributedClickId || sale.clickId,
    is_attributed: isAttributed,
    account_id: accountId,
    webhook_id: webhookId,
    project_id: projectId,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
