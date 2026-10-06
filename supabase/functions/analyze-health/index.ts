import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });

function fallback(payload: any) {
  const health = payload.daily_health?.[0] || {};
  const sleep = payload.sleep_sessions?.[0] || {};

  let score = 70;
  const findings: string[] = [];

  if (
    sleep.duration_minutes &&
    Number(sleep.duration_minutes) < 360
  ) {
    score -= 15;
    findings.push("Recent sleep duration is below six hours.");
  }

  if (
    health.resting_heart_rate &&
    Number(health.resting_heart_rate) > 75
  ) {
    score -= 10;
    findings.push(
      "Recent resting heart rate is above your preferred recovery range."
    );
  }

  if (
    health.stress_average &&
    Number(health.stress_average) > 60
  ) {
    score -= 10;
    findings.push("Recent average stress is elevated.");
  }

  if (
    health.body_battery_low != null &&
    Number(health.body_battery_low) < 20
  ) {
    score -= 10;
    findings.push("Body battery reached a low level.");
  }

  score = Math.max(1, Math.min(100, score));

  return {
    readiness_score: score,

    summary: findings.length
      ? "Some recovery signals need attention. Consider easier activity and prioritize recovery."
      : "Available wellness signals appear generally stable.",

    report_json: {
      headline:
        score >= 75
          ? "Stable wellness signals"
          : "Recovery deserves attention",

      wellness_note:
        "This is wellness guidance, not medical diagnosis.",

      key_findings: findings.length
        ? findings
        : [
            "No major concern was identified from the available data."
          ],

      possible_concerns: [],

      training_recommendation:
        score < 60
          ? "Choose light recovery activity and reassess how you feel."
          : "Moderate training may be suitable if you feel well.",

      recovery_recommendation:
        "Prioritize sleep, hydration and balanced meals.",

      weight_management_note:
        "Use a gradual calorie deficit and consistent daily movement.",

      risk_level: score < 50 ? "medium" : "low"
    }
  };
}

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("Gemini did not return valid JSON.");
  }

  return JSON.parse(match[0]);
}

function validateAiResult(parsed: any, fallbackResult: any) {
  if (!parsed || typeof parsed !== "object") {
    return fallbackResult;
  }

  const readinessScore = Math.max(
    1,
    Math.min(
      100,
      Math.round(Number(parsed.readiness_score) || 50)
    )
  );

  const reportJson = parsed.report_json || {};

  return {
    readiness_score: readinessScore,

    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : fallbackResult.summary,

    report_json: {
      headline:
        reportJson.headline ||
        fallbackResult.report_json.headline,

      wellness_note:
        reportJson.wellness_note ||
        "This is wellness guidance, not medical diagnosis.",

      key_findings: Array.isArray(reportJson.key_findings)
        ? reportJson.key_findings
        : fallbackResult.report_json.key_findings,

      possible_concerns: Array.isArray(
        reportJson.possible_concerns
      )
        ? reportJson.possible_concerns
        : [],

      training_recommendation:
        reportJson.training_recommendation ||
        fallbackResult.report_json.training_recommendation,

      recovery_recommendation:
        reportJson.recovery_recommendation ||
        fallbackResult.report_json.recovery_recommendation,

      weight_management_note:
        reportJson.weight_management_note ||
        fallbackResult.report_json.weight_management_note,

      risk_level: ["low", "medium", "high"].includes(
        reportJson.risk_level
      )
        ? reportJson.risk_level
        : fallbackResult.report_json.risk_level
    }
  };
}

async function requireData(
  queryResult: any,
  tableName: string
) {
  if (queryResult.error) {
    throw new Error(
      `${tableName} query failed: ${queryResult.error.message}`
    );
  }

  return queryResult.data || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        error: "Method not allowed"
      },
      405
    );
  }

  try {
    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return json(
        {
          error: "Missing authorization header"
        },
        401
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL secret is missing.");
    }

    if (!supabaseAnonKey) {
      throw new Error("SUPABASE_ANON_KEY secret is missing.");
    }

    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY secret is missing."
      );
    }

    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return json(
        {
          error: "Invalid or expired session"
        },
        401
      );
    }

    const db = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const body = await req.json().catch(() => ({}));

    const requestedDate =
      typeof body.report_date === "string"
        ? body.report_date
        : null;

    const reportDate =
      requestedDate ||
      new Date().toISOString().slice(0, 10);

    const profileQuery = await db
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileQuery.error) {
      throw new Error(
        `profiles query failed: ${profileQuery.error.message}`
      );
    }

    const [
      dailyResult,
      sleepResult,
      activitiesResult,
      measurementsResult,
      trainingResult
    ] = await Promise.all([
      db
        .from("daily_health")
        .select("*")
        .eq("user_id", user.id)
        .order("health_date", {
          ascending: false
        })
        .limit(14),

      db
        .from("sleep_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("sleep_date", {
          ascending: false
        })
        .limit(14),

      db
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", {
          ascending: false
        })
        .limit(20),

      db
        .from("body_measurements")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", {
          ascending: false
        })
        .limit(14),

      db
        .from("training_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("metric_date", {
          ascending: false
        })
        .limit(14)
    ]);

    const dailyHealth = await requireData(
      dailyResult,
      "daily_health"
    );

    const sleepSessions = await requireData(
      sleepResult,
      "sleep_sessions"
    );

    const activities = await requireData(
      activitiesResult,
      "activities"
    );

    const bodyMeasurements = await requireData(
      measurementsResult,
      "body_measurements"
    );

    const trainingMetrics = await requireData(
      trainingResult,
      "training_metrics"
    );

    const payload = {
      report_date: reportDate,
      generated_at: new Date().toISOString(),
      profile: profileQuery.data,
      daily_health: dailyHealth,
      sleep_sessions: sleepSessions,
      activities,
      body_measurements: bodyMeasurements,
      training_metrics: trainingMetrics
    };

    const fallbackResult = fallback(payload);
    let result = fallbackResult;
    let analysisSource = "fallback";

    if (geminiKey) {
      const prompt = `
You are a careful fitness and wellness data analyst.

Analyze the supplied personal wellness data.

Requirements:
- Do not diagnose medical conditions.
- Do not prescribe medication or treatment.
- Do not claim medical certainty.
- Do not invent missing measurements.
- Use only the provided data.
- Return only valid JSON.
- Do not include Markdown fences.

Return exactly this JSON structure:

{
  "readiness_score": 75,
  "summary": "Two or three sentence plain-language summary.",
  "report_json": {
    "headline": "Short headline",
    "wellness_note": "This is wellness guidance, not medical diagnosis.",
    "key_findings": ["Finding"],
    "possible_concerns": [],
    "training_recommendation": "Actionable guidance",
    "recovery_recommendation": "Actionable guidance",
    "weight_management_note": "Actionable guidance",
    "risk_level": "low"
  }
}

Rules:
- readiness_score must be an integer from 1 to 100.
- risk_level must be low, medium, or high.

Data:

${JSON.stringify(payload)}
      `.trim();

      try {
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(
            geminiKey
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 1600
              }
            })
          }
        );

        if (!aiResponse.ok) {
          const geminiErrorText = await aiResponse.text();

          console.error(
            "Gemini request failed:",
            aiResponse.status,
            geminiErrorText
          );
        } else {
          const aiJson = await aiResponse.json();

          const aiText =
            aiJson.candidates?.[0]?.content?.parts
              ?.map((part: any) => part.text || "")
              .join("") || "";

          if (!aiText) {
            console.error(
              "Gemini returned no candidate text:",
              JSON.stringify(aiJson)
            );
          } else {
            const parsed = extractJson(aiText);

            result = validateAiResult(
              parsed,
              fallbackResult
            );

            analysisSource = "gemini";
          }
        }
      } catch (geminiError) {
        console.error(
          "Gemini processing failed:",
          geminiError
        );

        result = fallbackResult;
        analysisSource = "fallback";
      }
    } else {
      console.warn(
        "GEMINI_API_KEY is missing. Using fallback analysis."
      );
    }

    /*
     * IMPORTANT:
     * insert() is used instead of upsert().
     * Every Generate Analysis request creates a new history row.
     */
    const {
      data: saved,
      error: saveError
    } = await db
      .from("ai_reports")
      .insert({
        user_id: user.id,
        report_date: reportDate,
        readiness_score: result.readiness_score,
        summary: result.summary,
        report_json: {
          ...result.report_json,
          analysis_source: analysisSource,
          generated_at: new Date().toISOString()
        }
      })
      .select("*")
      .single();

    if (saveError) {
      console.error(
        "ai_reports insert failed:",
        saveError
      );

      throw new Error(
        `Unable to save AI report: ${saveError.message}`
      );
    }

    console.log(
      "AI report created:",
      saved.id,
      saved.created_at
    );

    return json({
      success: true,
      report: saved
    });
  } catch (error) {
    console.error("analyze-health error:", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error)
      },
      500
    );
  }
});