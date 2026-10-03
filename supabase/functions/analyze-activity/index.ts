import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured in Supabase Edge Function secrets." }, 503);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

  try {
    const body = await req.json();
    const activity = body?.activity;
    const streams = body?.streams ?? {};
    if (!activity || typeof activity !== "object") return json({ error: "Activity data is required." }, 400);

    const system = `You are a careful endurance-training activity analyst. Analyze only the supplied activity facts and stream statistics. Never invent missing values, claim a medical diagnosis, infer heart-rate zones without age/max-HR settings, or overstate causality. Be encouraging but precise. Note data gaps. Give conservative, practical training/recovery suggestions. Return ONLY valid JSON with this schema: {"headline":"short title","summary":"2-3 sentence summary","key_findings":["..."],"recommendations":["..."],"data_limitations":["..."]}. Keep each list to at most 4 concise items. If data is sparse, say so.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ activity, streams }) },
        ],
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: payload?.error?.message || `AI provider request failed (${response.status}).` }, 502);
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return json({ error: "AI provider returned an empty response." }, 502);
    let analysis;
    try { analysis = JSON.parse(content); } catch { return json({ error: "AI response was not valid JSON." }, 502); }
    return json({ analysis, generated_at: new Date().toISOString(), model: "gpt-4o-mini" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected analysis error." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
