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
    const page = url.searchParams.get("page") || "dashboard"; // "dashboard" or "utm"
    const dateFrom = url.searchParams.get("from");
    const dateTo = url.searchParams.get("to");

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

    if (page === "dashboard") {
      // Get conversions data
      let query = supabase
        .from("conversions")
        .select("id, amount, status, product_name, payment_method, created_at, utm_source, utm_medium, utm_campaign, project_id")
        .eq("account_id", account_id)
        .eq("project_id", project_id);

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);

      const { data: conversions } = await query.order("created_at", { ascending: false }).limit(1000);

      // Get clicks
      let clicksQuery = supabase
        .from("clicks")
        .select("id, created_at, device_type, country, smartlink_id")
        .eq("account_id", account_id)
        .eq("project_id", project_id);

      if (dateFrom) clicksQuery = clicksQuery.gte("created_at", dateFrom);
      if (dateTo) clicksQuery = clicksQuery.lte("created_at", dateTo);

      const { data: clicks } = await clicksQuery.limit(1000);

      return new Response(JSON.stringify({
        project_name: project?.name || "Projeto",
        page: "dashboard",
        conversions: conversions || [],
        clicks: clicks || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (page === "utm") {
      let query = supabase
        .from("conversions")
        .select("id, amount, status, product_name, payment_method, created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, project_id")
        .eq("account_id", account_id)
        .eq("project_id", project_id);

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);

      const { data: conversions } = await query.order("created_at", { ascending: false }).limit(1000);

      return new Response(JSON.stringify({
        project_name: project?.name || "Projeto",
        page: "utm",
        conversions: conversions || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid page" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
