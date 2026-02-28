import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const dateFrom = url.searchParams.get("from");
    const dateTo = url.searchParams.get("to");
    const prevFrom = url.searchParams.get("prev_from");
    const prevTo = url.searchParams.get("prev_to");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("shared_view_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Invalid or inactive token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (!tokenData.is_permanent && tokenData.expires_at) {
      if (new Date(tokenData.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { account_id, project_id } = tokenData;

    // Get project name
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", project_id)
      .maybeSingle();

    // Fetch all data in parallel
    let convQuery = supabase
      .from("conversions")
      .select("id, amount, fees, net_amount, status, product_name, is_order_bump, payment_method, utm_source, utm_medium, utm_campaign, utm_content, utm_term, created_at, click_id, smartlink_id, variant_id, paid_at")
      .eq("account_id", account_id)
      .eq("project_id", project_id)
      .eq("status", "approved");

    let clicksQuery = supabase
      .from("clicks")
      .select("id, created_at, smartlink_id, variant_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, click_id")
      .eq("account_id", account_id)
      .eq("project_id", project_id);

    let smartlinksQuery = supabase
      .from("smartlinks")
      .select("id, name, slug, is_active, created_at, smartlink_variants(id, name, url, weight, is_active)")
      .eq("account_id", account_id)
      .eq("project_id", project_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (dateFrom) {
      convQuery = convQuery.gte("created_at", dateFrom);
      clicksQuery = clicksQuery.gte("created_at", dateFrom);
    }
    if (dateTo) {
      convQuery = convQuery.lte("created_at", dateTo);
      clicksQuery = clicksQuery.lte("created_at", dateTo);
    }

    // Previous period queries for comparison
    const queries: Promise<any>[] = [
      convQuery.order("created_at", { ascending: false }).limit(1000),
      clicksQuery.limit(1000),
      smartlinksQuery,
    ];

    // Add previous period queries if provided
    if (prevFrom && prevTo) {
      let prevConvQuery = supabase
        .from("conversions")
        .select("id, amount")
        .eq("account_id", account_id)
        .eq("project_id", project_id)
        .eq("status", "approved")
        .gte("created_at", prevFrom)
        .lte("created_at", prevTo);

      let prevClicksQuery = supabase
        .from("clicks")
        .select("id")
        .eq("account_id", account_id)
        .eq("project_id", project_id)
        .gte("created_at", prevFrom)
        .lte("created_at", prevTo);

      queries.push(prevConvQuery.limit(1000), prevClicksQuery.limit(1000));
    }

    const results = await Promise.all(queries);
    const [convResult, clicksResult, smartlinksResult] = results;

    const response: any = {
      project_name: project?.name || "Projeto",
      conversions: convResult.data || [],
      clicks: clicksResult.data || [],
      smartlinks: smartlinksResult.data || [],
    };

    if (prevFrom && prevTo && results.length >= 5) {
      response.prev_conversions = results[3].data || [];
      response.prev_clicks = results[4].data || [];
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
