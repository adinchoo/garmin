let selectedMealImage = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("dashboard-page")) return;
  document.getElementById("mealPhoto")?.addEventListener("change", prepareMealPhoto);
  document.getElementById("analyzeMealButton")?.addEventListener("click", analyzeAndLogMeal);
});

async function prepareMealPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showToast("Use a JPG, PNG or WebP image.", "error");
    event.target.value = "";
    return;
  }

  try {
    selectedMealImage = await compressMealImage(file);
    const preview = document.getElementById("mealPreview");
    preview.src = URL.createObjectURL(selectedMealImage.blob);
    preview.style.display = "block";
    document.getElementById("photoPrompt").style.display = "none";
  } catch (error) {
    showToast(error.message, "error");
  }
}

function compressMealImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxDimension = 1280;
      let width = image.width;
      let height = image.height;

      if (Math.max(width, height) > maxDimension) {
        const ratio = maxDimension / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);

      canvas.toBlob(blob => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) return reject(new Error("Could not process this photo."));

        const reader = new FileReader();
        reader.onload = () => resolve({
          blob,
          base64: String(reader.result).split(",")[1],
          mimeType: "image/jpeg"
        });
        reader.onerror = () => reject(new Error("Could not read the compressed photo."));
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.82);
    };

    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = objectUrl;
  });
}

async function analyzeAndLogMeal() {
  if (!selectedMealImage) {
    showToast("Take or choose a meal photo first.", "error");
    return;
  }

  const button = document.getElementById("analyzeMealButton");
  setBusy(button, true, "Analyzing and logging...");

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error("Your session expired. Please sign in again.");

    const response = await fetch(
      `${APP_CONFIG.SUPABASE_URL}/functions/v1/${APP_CONFIG.MEAL_FUNCTION_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": APP_CONFIG.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          image_base64: selectedMealImage.base64,
          mime_type: selectedMealImage.mimeType,
          meal_type: document.getElementById("mealType").value,
          note: document.getElementById("mealNote").value.trim()
        })
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Meal analysis failed.");

    renderMealAnalysis(result);
    await loadNutrition();
    showToast("Meal analyzed and automatically logged.");
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  } finally {
    setBusy(button, false);
  }
}

function renderMealAnalysis(meal) {
  document.getElementById("mealAnalysisEmpty").hidden = true;
  document.getElementById("mealAnalysis").hidden = false;

  text("mealName", meal.meal_name || "Analyzed meal");
  text("mealCalories", `${Math.round(Number(meal.calories) || 0)} kcal`);
  text("mealProtein", `${Number(meal.protein_g || 0).toFixed(1)} g`);
  text("mealCarbs", `${Number(meal.carbs_g || 0).toFixed(1)} g`);
  text("mealFat", `${Number(meal.fat_g || 0).toFixed(1)} g`);
  text("mealFiber", `${Number(meal.fiber_g || 0).toFixed(1)} g`);
  text("mealConfidence", `${capitalize(meal.confidence || "low")} confidence estimate`);
  text("mealSummary", meal.analysis_summary || "");

  const items = meal.food_items || [];
  document.getElementById("mealItems").innerHTML = items.map(item => `
    <div>
      <span>${escapeHtml(item.name || item.food_name || "Food item")}</span>
      <strong>${Math.round(Number(item.calories) || 0)} kcal</strong>
    </div>
  `).join("");
}

async function loadNutrition() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("meals")
    .select(`
      id,
      user_id,
      meal_date,
      meal_time,
      meal_type,
      meal_name,
      photo_path,
      ai_confidence,
      ai_analysis_summary,
      estimated_calories,
      estimated_protein_g,
      estimated_carbs_g,
      estimated_fat_g,
      estimated_fiber_g,
      meal_items (
        id,
        food_name,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        estimated_portion,
        sort_order
      )
    `)
    .eq("user_id", currentUser.id)
    .order("meal_time", { ascending: false })
    .limit(30);

  if (error) {
    console.warn(error.message);
    return;
  }

  const meals = (data || []).map(meal => {
    const items = meal.meal_items || [];
    const sum = key => items.reduce((total, item) => total + Number(item[key] || 0), 0);

    return {
      ...meal,
      calories: Number(meal.estimated_calories || sum("calories")),
      protein_g: Number(meal.estimated_protein_g || sum("protein_g")),
      carbs_g: Number(meal.estimated_carbs_g || sum("carbs_g")),
      fat_g: Number(meal.estimated_fat_g || sum("fat_g")),
      fiber_g: Number(meal.estimated_fiber_g || sum("fiber_g"))
    };
  });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = meals.filter(meal => new Date(meal.meal_time) >= start);
  const sumToday = key => today.reduce((total, meal) => total + Number(meal[key] || 0), 0);

  text("nutritionToday", `${Math.round(sumToday("calories"))} kcal today`);
  text("mealsToday", today.length);
  text("proteinToday", `${sumToday("protein_g").toFixed(1)} g`);
  text("carbsToday", `${sumToday("carbs_g").toFixed(1)} g`);
  text("fatToday", `${sumToday("fat_g").toFixed(1)} g`);

  const history = document.getElementById("mealHistory");
  history.innerHTML = meals.length
    ? meals.slice(0, 10).map(meal => `
      <article class="meal-row">
        <div class="meal-thumb">${meal.photo_path ? "📷" : "🍽"}</div>
        <div>
          <strong>${escapeHtml(meal.meal_name || "Meal")}</strong>
          <span>${capitalize(meal.meal_type)} • ${formatDateTime(meal.meal_time)}</span>
        </div>
        <div class="meal-macros">
          <strong>${Math.round(meal.calories)} kcal</strong>
          <span>P ${meal.protein_g.toFixed(0)}g • C ${meal.carbs_g.toFixed(0)}g • F ${meal.fat_g.toFixed(0)}g</span>
        </div>
      </article>
    `).join("")
    : '<div class="empty-state">No meals logged yet.</div>';
}
