import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Basic field sanitization for critical string fields
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

  // Enforce payload size limit (100KB)
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
  // Extract token from URL path: /webhook/{token}
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path is like: /webhook/TOKEN or /functions/v1/webhook/TOKEN
  const token = pathParts[pathParts.length - 1];

  // Also support legacy x-webhook-secret header
  const headerSecret = req.headers.get('x-webhook-secret');

  let accountId: string | null = null;
  let webhookId: string | null = null;
  let linkedProductIds: string[] = [];

  if (token && token !== 'webhook') {
    // Token-based lookup (new architecture)
    const { data: webhook } = await supabase
      .from('webhooks')
      .select('id, account_id, is_active, platform')
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
      });
      return new Response(JSON.stringify({ error: 'Webhook inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    accountId = webhook.account_id;
    webhookId = webhook.id;

    // Fetch linked products
    const { data: wpRows } = await supabase
      .from('webhook_products')
      .select('product_id')
      .eq('webhook_id', webhook.id);
    linkedProductIds = (wpRows || []).map((r: any) => r.product_id);

  } else if (headerSecret) {
    // Legacy header-based lookup (backward compat)
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('webhook_secret', headerSecret)
      .maybeSingle();

    if (!account) {
      await supabase.from('webhook_logs').insert({
        platform: 'unknown',
        raw_payload: rawPayload,
        status: 'error',
        ignore_reason: 'Invalid x-webhook-secret header',
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    accountId = account.id;
  } else {
    // No authentication at all
    await supabase.from('webhook_logs').insert({
      platform: 'unknown',
      raw_payload: rawPayload,
      status: 'error',
      ignore_reason: 'No token in URL and no x-webhook-secret header',
    });
    return new Response(JSON.stringify({ error: 'Missing authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const platform = detectPlatform(rawPayload);

  let logEntry: Record<string, unknown> = {
    platform,
    raw_payload: rawPayload,
    status: 'received',
    account_id: accountId,
  };

  if (platform === 'sale_platform') {
    const result = await processSale(rawPayload, supabase, accountId, linkedProductIds, webhookId);
    logEntry = { ...logEntry, ...result };
  } else {
    logEntry.status = 'ignored';
    logEntry.ignore_reason = 'Unknown platform or event format';
  }

  // Attribute click if found
  if (logEntry.attributed_click_id) {
    const { data: click } = await supabase
      .from('clicks')
      .select('account_id, smartlink_id, variant_id')
      .eq('click_id', logEntry.attributed_click_id as string)
      .maybeSingle();
    if (click) {
      if (!accountId) logEntry.account_id = click.account_id;
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
  if (data.event && typeof data.event === 'string' && data.event.startsWith('PURCHASE')) return 'sale_platform';
  if (data.data?.purchase) return 'sale_platform';
  if (data.event === 'purchase_approved' || data.data?.status === 'paid' || data.data?.amount !== undefined) return 'sale_platform';
  return 'unknown';
}

async function processSale(
  payload: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  accountId: string | null,
  linkedProductIds: string[],
  webhookId: string | null,
) {
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

  // Negative events
  if (negativeEvents[event]) {
    const purchase = data.data?.purchase;
    const transactionId = purchase?.transaction;
    if (transactionId) {
      await supabase.from('conversions').update({ status: negativeEvents[event] }).eq('transaction_id', transactionId);
      await supabase.from('conversion_events').insert({
        transaction_id: transactionId,
        event_type: negativeEvents[event],
        account_id: accountId,
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

  const status = data.data?.status;
  if (negativeStatuses[status]) {
    const orderData = data.data || data;
    const transactionId = String(orderData.id || '');
    if (transactionId) {
      await supabase.from('conversions').update({ status: negativeStatuses[status] }).eq('transaction_id', transactionId);
      await supabase.from('conversion_events').insert({
        transaction_id: transactionId,
        event_type: negativeStatuses[status],
        account_id: accountId,
        raw_payload: payload,
      });
    }
    return {
      event_type: event || status,
      transaction_id: transactionId || null,
      status: negativeStatuses[status],
      attributed_click_id: extractClickId(orderData),
      is_attributed: !!extractClickId(orderData),
    };
  }

  // Positive events
  const isApproved = event === 'PURCHASE_APPROVED' || event === 'purchase_approved' || status === 'paid';
  if (!isApproved) {
    return { event_type: event || status, status: 'ignored', ignore_reason: `Not approved: ${event || status}` };
  }

  const purchase = data.data?.purchase;
  const product = data.data?.product;
  const orderData = data.data || data;

  let transactionId: string, amount: number, currency: string, productName: string, paidAt: string, isOrderBump: boolean;
  let externalProductId: string | null = null;

  if (purchase) {
    transactionId = sanitizeString(purchase.transaction, 200) || '';
    amount = typeof purchase.price?.value === 'number' ? purchase.price.value : 0;
    currency = sanitizeString(purchase.price?.currency_value, 10) || 'BRL';
    productName = sanitizeString(product?.name, 300) || 'Unknown';
    externalProductId = product?.id ? sanitizeString(String(product.id), 100) : null;
    paidAt = purchase.order_date ? new Date(purchase.order_date).toISOString() : new Date().toISOString();
    isOrderBump = purchase.order_bump?.is_order_bump === true;
  } else {
    transactionId = sanitizeString(String(orderData.id || ''), 200) || '';
    const rawAmount = orderData.amount;
    amount = typeof rawAmount === 'number' ? rawAmount / 100 : 0;
    currency = sanitizeString(orderData.offer?.currency, 10) || 'BRL';
    productName = sanitizeString(orderData.product?.name, 300) || 'Unknown';
    externalProductId = orderData.product?.id ? sanitizeString(String(orderData.product.id), 100) : null;
    paidAt = orderData.paidAt ? new Date(orderData.paidAt).toISOString() : new Date().toISOString();
    isOrderBump = orderData.offer_type && orderData.offer_type !== 'main';
  }

  if (!transactionId) return { event_type: event, status: 'error', ignore_reason: 'Missing transaction id' };

  // Validate product linkage if webhook has linked products
  if (linkedProductIds.length > 0 && externalProductId && accountId) {
    const { data: matchedProduct } = await supabase
      .from('products')
      .select('id')
      .eq('account_id', accountId)
      .eq('external_id', externalProductId)
      .in('id', linkedProductIds)
      .maybeSingle();

    if (!matchedProduct) {
      return {
        event_type: event,
        status: 'ignored',
        ignore_reason: `Product ${externalProductId} not linked to this webhook`,
        transaction_id: transactionId,
      };
    }
  }

  const clickId = extractClickId(purchase || orderData);

  const { data: existing } = await supabase.from('conversions').select('id').eq('transaction_id', transactionId).maybeSingle();
  if (existing) {
    return { event_type: event, transaction_id: transactionId, status: 'duplicate', ignore_reason: 'Duplicate', attributed_click_id: clickId, is_attributed: !!clickId };
  }

  // Attribute via click
  let smartlinkId = null, variantId = null;
  if (clickId) {
    const { data: click } = await supabase.from('clicks').select('smartlink_id, variant_id, account_id').eq('click_id', clickId).maybeSingle();
    if (click) {
      smartlinkId = click.smartlink_id;
      variantId = click.variant_id;
      if (!accountId) accountId = click.account_id;
    }
  }

  const { data: convRow } = await supabase.from('conversions').insert({
    account_id: accountId,
    click_id: clickId,
    smartlink_id: smartlinkId,
    variant_id: variantId,
    transaction_id: transactionId,
    platform: 'sale_platform',
    product_name: productName,
    amount,
    currency,
    is_order_bump: !!isOrderBump,
    status: 'approved',
    paid_at: paidAt,
    raw_payload: payload,
  }).select('id').single();

  if (convRow) {
    const items: Array<Record<string, unknown>> = [{
      conversion_id: convRow.id,
      account_id: accountId,
      product_name: productName,
      amount,
      is_order_bump: !!isOrderBump,
    }];

    const orderBumps = purchase?.order_bump?.order_bump_items || orderData?.order_bumps || [];
    if (Array.isArray(orderBumps)) {
      for (const bump of orderBumps) {
        items.push({
          conversion_id: convRow.id,
          account_id: accountId,
          product_name: bump.name || bump.product_name || 'Order Bump',
          amount: bump.price?.value || bump.amount || 0,
          is_order_bump: true,
        });
      }
    }
    await supabase.from('conversion_items').insert(items);
  }

  await supabase.from('conversion_events').insert({
    transaction_id: transactionId,
    event_type: 'approved',
    account_id: accountId,
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

function extractClickId(data: Record<string, unknown>): string | null {
  if (!data) return null;
  const candidates = [(data as any).click_id, (data as any).utm_term, (data as any).sck];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}
