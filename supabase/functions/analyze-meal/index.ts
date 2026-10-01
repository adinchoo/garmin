import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function parseGeminiJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini did not return valid nutrition JSON.");
  return JSON.parse(match[0]);
}

function safeNumber(value: unknown) {
  return Math.max(0, Number(value) || 0);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let createdMealId: string | null = null;

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return jsonResponse({ error: "Missing authorization header." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Invalid or expired session." }, 401);

    const input = await request.json();
    if (!input.image_base64 || !input.mime_type) throw new Error("Meal photo is required.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(input.mime_type)) {
      throw new Error("Unsupported meal photo format.");
    }
    if (String(input.image_base64).length > 8_000_000) {
      throw new Error("Photo is too large. Use an image under 6 MB.");
    }

    const prompt = `
Analyze this meal photo for a personal nutrition diary.
Identify visible foods and estimate realistic portion sizes and nutrition.
Be conservative. Do not invent foods that are not visible or mentioned.
The user note is: ${String(input.note || "No note provided")}.

Return only valid JSON using this exact structure:
{
  "meal_name": "short meal name",
  "confidence": "low|medium|high",
  "analysis_summary": "brief estimate and uncertainty explanation",
  "possible_hidden_calories": ["oil, sauce, sugar, or other uncertainty if relevant"],
  "totals": {
    "calories": 500,
    "protein_g": 30,
    "carbs_g": 55,
    "fat_g": 18,
    "fiber_g": 6
  },
  "food_items": [
    {
      "name": "food name",
      "portion": "estimated portion",
      "quantity": 1,
      "quantity_unit": "serving",
      "calories": 100,
      "protein_g": 10,
      "carbs_g": 10,
      "fat_g": 3,
      "fiber_g": 2,
      "sugar_g": 1,
      "sodium_mg": 100,
      "confidence": "low|medium|high",
      "notes": "brief item note"
    }
  ]
}

All nutrition values are estimates. Do not provide diagnosis or medical advice.
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: input.mime_type, data: input.image_base64 } }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.15,
            maxOutputTokens: 1800
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini request failed: ${await geminiResponse.text()}`);
    }

    const geminiBody = await geminiResponse.json();
    const responseText = geminiBody.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("") || "";

    const analysis = parseGeminiJson(responseText);
    const totals = analysis.totals || {};
    const foodItems = Array.isArray(analysis.food_items) ? analysis.food_items : [];
    if (!foodItems.length) throw new Error("Gemini could not identify food items in this photo.");

    const database = createClient(supabaseUrl, serviceRoleKey);
    const extension = input.mime_type === "image/png" ? "png" : input.mime_type === "image/webp" ? "webp" : "jpg";
    const photoPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const photoBytes = Uint8Array.from(atob(input.image_base64), character => character.charCodeAt(0));

    const { error: uploadError } = await database.storage
      .from("meal-photos")
      .upload(photoPath, photoBytes, { contentType: input.mime_type, upsert: false });

    if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

    const mealTime = new Date().toISOString();
    const mealDate = mealTime.slice(0, 10);
    const confidence = ["low", "medium", "high"].includes(analysis.confidence)
      ? analysis.confidence
      : "low";

    const { data: meal, error: mealError } = await database
      .from("meals")
      .insert({
        user_id: user.id,
        meal_date: mealDate,
        meal_time: mealTime,
        meal_type: String(input.meal_type || "meal"),
        meal_name: String(analysis.meal_name || "Analyzed meal"),
        notes: String(input.note || "") || null,
        photo_path: photoPath,
        photo_mime_type: input.mime_type,
        estimated_calories: Math.round(safeNumber(totals.calories)),
        estimated_protein_g: safeNumber(totals.protein_g),
        estimated_carbs_g: safeNumber(totals.carbs_g),
        estimated_fat_g: safeNumber(totals.fat_g),
        estimated_fiber_g: safeNumber(totals.fiber_g),
        ai_confidence: confidence,
        ai_analysis_summary: String(analysis.analysis_summary || "Photo-based nutrition estimate."),
        ai_possible_hidden_calories: analysis.possible_hidden_calories || [],
        ai_raw_response: analysis,
        analysis_status: "completed",
        analyzed_at: mealTime
      })
      .select()
      .single();

    if (mealError) {
      await database.storage.from("meal-photos").remove([photoPath]);
      throw mealError;
    }

    createdMealId = meal.id;

    const itemRows = foodItems.map((item: Record<string, unknown>, index: number) => ({
      user_id: user.id,
      meal_id: meal.id,
      food_id: null,
      food_name: String(item.name || `Food item ${index + 1}`),
      quantity: Math.max(0.01, Number(item.quantity) || 1),
      quantity_unit: String(item.quantity_unit || "serving"),
      calories: safeNumber(item.calories),
      protein_g: safeNumber(item.protein_g),
      carbs_g: safeNumber(item.carbs_g),
      fat_g: safeNumber(item.fat_g),
      fiber_g: safeNumber(item.fiber_g),
      sugar_g: safeNumber(item.sugar_g),
      sodium_mg: safeNumber(item.sodium_mg),
      estimated_portion: String(item.portion || "Estimated serving"),
      ai_detected: true,
      ai_confidence: ["low", "medium", "high"].includes(String(item.confidence))
        ? String(item.confidence)
        : confidence,
      ai_notes: String(item.notes || "") || null,
      source: "gemini_photo",
      sort_order: index
    }));

    const { data: savedItems, error: itemsError } = await database
      .from("meal_items")
      .insert(itemRows)
      .select();

    if (itemsError) {
      await database.from("meals").delete().eq("id", meal.id);
      await database.storage.from("meal-photos").remove([photoPath]);
      createdMealId = null;
      throw itemsError;
    }

    return jsonResponse({
      id: meal.id,
      meal_name: meal.meal_name,
      meal_type: meal.meal_type,
      meal_time: meal.meal_time,
      calories: meal.estimated_calories,
      protein_g: meal.estimated_protein_g,
      carbs_g: meal.estimated_carbs_g,
      fat_g: meal.estimated_fat_g,
      fiber_g: meal.estimated_fiber_g,
      confidence: meal.ai_confidence,
      analysis_summary: meal.ai_analysis_summary,
      photo_path: meal.photo_path,
      food_items: (savedItems || []).map(item => ({
        name: item.food_name,
        portion: item.estimated_portion,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g
      }))
    });
  } catch (error) {
    console.error("analyze-meal error", { createdMealId, error });
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
