import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agent_id, trigger_data } = await req.json();
    if (!agent_id) throw new Error("agent_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const startTime = Date.now();

    // Fetch agent config
    const { data: agent, error: agentErr } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) throw new Error("Agent not found");
    if (!agent.is_active) throw new Error("Agent is inactive");

    // Rate limit check
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase
      .from("agent_execution_logs")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agent_id)
      .gte("created_at", oneMinuteAgo);

    if ((count || 0) >= agent.max_executions_per_minute) {
      await supabase.from("agent_execution_logs").insert({
        agent_id,
        account_id: agent.account_id,
        trigger_data,
        status: "rate_limited",
        error_message: "Rate limit exceeded",
        duration_ms: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key
    const aiConfig = agent.ai_config || {};
    let apiKey = "";
    let provider = "";
    
    if (aiConfig.api_key_id) {
      const { data: keyData } = await supabase
        .from("ai_api_keys")
        .select("api_key_encrypted, provider")
        .eq("id", aiConfig.api_key_id)
        .single();
      if (keyData) {
        apiKey = keyData.api_key_encrypted;
        provider = keyData.provider;
      }
    }

    if (!apiKey) {
      throw new Error("No API key configured for this agent");
    }

    // Build prompt
    const systemPrompt = aiConfig.prompt || "You are a helpful assistant.";
    const toneInstruction = aiConfig.tone ? `\nTom de voz: ${aiConfig.tone}` : "";
    const emojiInstruction = aiConfig.use_emojis === false ? "\nNão use emojis." : "";
    const fullSystemPrompt = systemPrompt + toneInstruction + emojiInstruction;

    const userMessage = typeof trigger_data === "string" 
      ? trigger_data 
      : JSON.stringify(trigger_data);

    // Call AI based on provider
    let aiResponse = "";
    const model = aiConfig.model || "";

    if (provider === "openai") {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });
      const data = await resp.json();
      aiResponse = data.choices?.[0]?.message?.content || "";
    } else if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-3-haiku-20240307",
          max_tokens: 1024,
          system: fullSystemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      const data = await resp.json();
      aiResponse = data.content?.[0]?.text || "";
    } else if (provider === "groq") {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });
      const data = await resp.json();
      aiResponse = data.choices?.[0]?.message?.content || "";
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Execute actions
    const executedActions: any[] = [];
    for (const action of (agent.actions || [])) {
      try {
        if (action.type === "send_whatsapp") {
          // Get device
          const { data: device } = await supabase
            .from("whatsapp_devices")
            .select("*")
            .eq("account_id", agent.account_id)
            .eq("status", "connected")
            .limit(1)
            .single();

          if (device && trigger_data?.phone) {
            await fetch(`${device.api_url}/message/sendText/${device.instance_name}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: device.api_key_encrypted,
              },
              body: JSON.stringify({
                number: trigger_data.phone,
                text: aiResponse,
              }),
            });
            executedActions.push({ type: "send_whatsapp", status: "success" });
          }
        } else if (action.type === "update_lead_status") {
          executedActions.push({ type: "update_lead_status", status: "success" });
        } else if (action.type === "add_tag") {
          executedActions.push({ type: "add_tag", status: "success" });
        } else if (action.type === "add_note") {
          executedActions.push({ type: "add_note", status: "success" });
        }
      } catch (actionErr) {
        executedActions.push({ type: action.type, status: "error", error: String(actionErr) });
      }
    }

    // Log execution
    await supabase.from("agent_execution_logs").insert({
      agent_id,
      account_id: agent.account_id,
      trigger_data,
      ai_response: aiResponse,
      actions_executed: executedActions,
      status: "success",
      duration_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ response: aiResponse, actions: executedActions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-execute error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
