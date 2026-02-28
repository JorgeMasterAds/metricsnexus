import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // GET: Load survey publicly by slug
    if (req.method === "GET") {
      const url = new URL(req.url);
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return new Response(JSON.stringify({ error: "Missing slug" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: survey, error: sErr } = await supabase
        .from("surveys")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (sErr || !survey) {
        return new Response(JSON.stringify({ error: "Survey not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: questions } = await supabase
        .from("survey_questions")
        .select("id, type, title, description, is_required, position, options, config")
        .eq("survey_id", survey.id)
        .order("position");

      return new Response(JSON.stringify({ survey, questions: questions || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Submit response
    if (req.method === "POST") {
      const body = await req.json();
      const { survey_id, respondent_name, respondent_email, answers } = body;

      if (!survey_id || !answers) {
        return new Response(JSON.stringify({ error: "Missing data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load survey
      const { data: survey } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", survey_id)
        .single();

      if (!survey) {
        return new Response(JSON.stringify({ error: "Survey not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load questions for scoring
      const { data: questions } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", survey_id);

      // Calculate scoring
      let totalScore = 0;
      let maxPossible = 0;

      const answerRecords: any[] = [];

      for (const q of questions || []) {
        const answer = answers[q.id];
        let score = 0;

        if (survey.scoring_enabled && q.options) {
          // Calculate max possible for this question
          const optionScores = (q.options as any[]).map((o: any) => o.score || 0);
          if (optionScores.length > 0) {
            maxPossible += Math.max(...optionScores, 0);
          }

          // Calculate actual score
          if (answer && q.options) {
            if (Array.isArray(answer)) {
              // Checkbox: sum scores
              for (const val of answer) {
                const opt = (q.options as any[]).find((o: any) => (o.value || o.label) === val);
                if (opt) score += opt.score || 0;
              }
            } else if (typeof answer === "string") {
              const opt = (q.options as any[]).find((o: any) => (o.value || o.label) === answer);
              if (opt) score += opt.score || 0;
            }
          }
        }

        totalScore += score;

        answerRecords.push({
          question_id: q.id,
          account_id: survey.account_id,
          answer_value: typeof answer === "string" || typeof answer === "number" ? String(answer) : null,
          answer_options: Array.isArray(answer) ? answer : [],
          score,
        });
      }

      // Determine qualification
      let qualification: string | null = null;
      if (survey.scoring_enabled && maxPossible > 0) {
        const pct = (totalScore / maxPossible) * 100;
        if (pct >= 67) qualification = "Qualificado";
        else if (pct >= 34) qualification = "Parcialmente Qualificado";
        else qualification = "Não Qualificado";
      }

      // Insert response
      const { data: response, error: rErr } = await supabase
        .from("survey_responses")
        .insert({
          survey_id,
          account_id: survey.account_id,
          respondent_name: respondent_name || null,
          respondent_email: respondent_email || null,
          total_score: totalScore,
          max_possible_score: maxPossible,
          qualification,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (rErr) throw rErr;

      // Insert answers
      const answersToInsert = answerRecords.map((a) => ({
        ...a,
        response_id: response.id,
      }));

      if (answersToInsert.length > 0) {
        const { error: aErr } = await supabase.from("survey_answers").insert(answersToInsert);
        if (aErr) throw aErr;
      }

      return new Response(
        JSON.stringify({
          success: true,
          total_score: totalScore,
          max_possible_score: maxPossible,
          qualification,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error("survey-public error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
