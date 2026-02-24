import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

  // Validate x-webhook-secret header → find account
  const webhookSecret = req.headers.get('x-webhook-secret');
  let accountId: string | null = null;

  if (webhookSecret) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('webhook_secret', webhookSecret)
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
  }

  const platform = detectPlatform(rawPayload);

  let logEntry: Record<string, unknown> = {
    platform,
    raw_payload: rawPayload,
    status: 'received',
    account_id: accountId,
  };

  if (platform === 'sale_platform') {
    const result = await processSale(rawPayload, supabase, accountId);
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

async function processSale(payload: Record<string, unknown>, supabase: ReturnType<typeof createClient>, accountId: string | null) {
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

  if (purchase) {
    transactionId = purchase.transaction;
    amount = purchase.price?.value || 0;
    currency = purchase.price?.currency_value || 'BRL';
    productName = product?.name || 'Unknown';
    paidAt = purchase.order_date ? new Date(purchase.order_date).toISOString() : new Date().toISOString();
    isOrderBump = purchase.order_bump?.is_order_bump === true;
  } else {
    transactionId = String(orderData.id || '');
    amount = (orderData.amount || 0) / 100;
    currency = orderData.offer?.currency || 'BRL';
    productName = orderData.product?.name || 'Unknown';
    paidAt = orderData.paidAt ? new Date(orderData.paidAt).toISOString() : new Date().toISOString();
    isOrderBump = orderData.offer_type && orderData.offer_type !== 'main';
  }

  if (!transactionId) return { event_type: event, status: 'error', ignore_reason: 'Missing transaction id' };

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
