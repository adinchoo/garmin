import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" }
});

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Missing authorization header." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) return json({ error: "GEMINI_API_KEY is not configured for this Supabase function." }, 503);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid or expired session." }, 401);
    const { data: meals, error: mealError } = await userClient.from("meals")
      .select("meal_name,meal_type,meal_time,estimated_calories,estimated_protein_g,estimated_carbs_g,estimated_fat_g,estimated_fiber_g,ai_analysis_summary")
      .eq("user_id", user.id)
      .gte("meal_time", new Date(Date.now() - 13 * 86400000).toISOString())
      .lte("meal_time", new Date().toISOString())
      .order("meal_time", { ascending: true }).limit(100);
    if (mealError) return json({ error: `Could not read your food diary: ${mealError.message}` }, 400);
    if (!meals?.length) return json({ suggestions: [{ title: "Start with a simple log", body: "Log typical meals and approximate portions. After a few days, this coach can look for patterns in meal timing, variety and fueling." }], period: "your food diary" });

    const prompt = `You are a supportive nutrition-pattern coach. Review the user's food diary entries from approximately the last 14 days. The entries are estimates and may be incomplete. Do not diagnose, shame, moralize food, prescribe weight loss, set strict calorie limits, encourage restriction, or claim that missing logs mean the person skipped meals. Do not infer age, sex, body size, medical status, or exercise load. Prefer practical, balanced, culturally flexible suggestions. Note uncertainty when data is sparse. Focus on meal timing if supported, variety, fibre-rich foods, protein distribution, hydration only if diary notes support it, and fueling around activity only if supported by context. Return ONLY valid JSON with this shape: {"period":"recent diary","summary":"one short sentence","suggestions":[{"title":"short heading","body":"one or two practical sentences grounded in the entries"}]}. Provide 2 to 4 suggestions, no numeric calorie target, no medical advice. If fewer than 4 entries, explicitly say the sample is too small for strong conclusions and give gentle logging tips.\n\nDiary JSON:\n${JSON.stringify(meals.map(m => ({ meal_name: m.meal_name, meal_type: m.meal_type, meal_time: m.meal_time, calories: m.estimated_calories, protein_g: m.estimated_protein_g, carbs_g: m.estimated_carbs_g, fat_g: m.estimated_fat_g, fiber_g: m.estimated_fiber_g, notes: m.ai_analysis_summary })))}`;
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 900 } })
    });
    if (!aiResponse.ok) return json({ error: `AI provider request failed (${aiResponse.status}).` }, 502);
    const aiBody = await aiResponse.json();
    const raw = aiBody.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "AI did not return a valid suggestion set." }, 502);
    const result = JSON.parse(match[0]);
    const suggestions = Array.isArray(result.suggestions) ? result.suggestions.slice(0, 4).map((item: Record<string, unknown>) => ({
      title: String(item.title || "Eating pattern suggestion").slice(0, 100),
      body: String(item.body || "").slice(0, 500)
    })).filter((item: { title: string; body: string }) => item.body) : [];
    return json({ period: String(result.period || "recent diary").slice(0, 80), summary: String(result.summary || "").slice(0, 300), suggestions });
  } catch (error) {
    console.error("Eating pattern analysis failed", error);
    return json({ error: error instanceof Error ? error.message : "Eating pattern analysis failed." }, 500);
  }
});
