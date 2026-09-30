let currentUser = null;

window.onload = async () => {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.href = "./index.html";
    return;
  }

  currentUser = user;

  document.getElementById("userEmail").textContent = user.email;

  await ensureProfile(user);
  await loadProfile(user.id);
  await loadHealth(user.id);
  await loadActivities(user.id);
  await loadLatestAiReport(user.id);
};

async function ensureProfile(user) {
  const fullName = user.user_metadata?.full_name || user.email;

  await supabaseClient
    .from("profiles")
    .upsert({
      user_id: user.id,
      full_name: fullName
    }, {
      onConflict: "user_id"
    });
}

async function loadProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return;

  document.getElementById("weight").textContent =
    data.current_weight_kg ? `${data.current_weight_kg} kg` : "-";

  document.getElementById("targetWeight").textContent =
    data.target_weight_kg ? `${data.target_weight_kg} kg` : "-";
}

async function loadHealth(userId) {
  const { data, error } = await supabaseClient
    .from("daily_health")
    .select("*")
    .eq("user_id", userId)
    .order("health_date", { ascending: false })
    .limit(7);

  if (error || !data || data.length === 0) return;

  const latest = data[0];

  document.getElementById("steps").textContent = latest.steps ?? 0;
  document.getElementById("rhr").textContent = latest.resting_heart_rate ?? "-";
  document.getElementById("stress").textContent = latest.stress_average ?? "-";
  document.getElementById("readiness").textContent = `${calculateReadiness(latest)}%`;

  const list = document.getElementById("dailyHealthList");
  list.innerHTML = "";

  data.forEach(h => {
    list.innerHTML += `
      <div class="health-item">
        <strong>${h.health_date}</strong><br>
        Steps: ${h.steps ?? 0}<br>
        Resting HR: ${h.resting_heart_rate ?? "-"}<br>
        Stress: ${h.stress_average ?? "-"}<br>
        Body Battery: ${h.body_battery_low ?? "-"} - ${h.body_battery_high ?? "-"}
      </div>
    `;
  });
}

function calculateReadiness(h) {
  let score = 60;

  if ((h.steps ?? 0) > 5000) score += 10;
  if ((h.steps ?? 0) > 10000) score += 5;
  if ((h.resting_heart_rate ?? 999) < 65) score += 10;
  if ((h.stress_average ?? 100) < 40) score += 10;
  if ((h.body_battery_low ?? 100) < 20) score -= 15;
  if ((h.stress_average ?? 0) > 70) score -= 15;

  return Math.max(1, Math.min(score, 100));
}

async function loadActivities(userId) {
  const { data, error } = await supabaseClient
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(10);

  if (error) return;

  const tbody = document.getElementById("activitiesTable");
  tbody.innerHTML = "";

  data.forEach(a => {
    const distanceKm = a.distance_m
      ? `${(Number(a.distance_m) / 1000).toFixed(2)} km`
      : "-";

    const durationMin = a.duration_seconds
      ? `${Math.round(a.duration_seconds / 60)} min`
      : "-";

    tbody.innerHTML += `
      <tr>
        <td>${escapeHtml(a.activity_name || "-")}</td>
        <td>${escapeHtml(a.activity_type || "-")}</td>
        <td>${distanceKm}</td>
        <td>${durationMin}</td>
        <td>${a.calories || 0}</td>
        <td>${a.avg_heart_rate || "-"}</td>
      </tr>
    `;
  });
}

async function loadLatestAiReport(userId) {
  const { data, error } = await supabaseClient
    .from("ai_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return;

  const report = data[0];

  document.getElementById("readiness").textContent =
    report.readiness_score ? `${report.readiness_score}%` : "-";

  document.getElementById("aiReport").textContent =
    `${report.summary || ""}\n\n${JSON.stringify(report.report_json, null, 2)}`;
}

async function generateAiReport() {
  const reportBox = document.getElementById("aiReport");

  if (!currentUser) {
    reportBox.textContent = "User not logged in.";
    return;
  }

  if (typeof puter === "undefined") {
    reportBox.textContent = "Puter AI is not loaded.";
    return;
  }

  reportBox.textContent = "Collecting health data...";

  const payload = await collectHealthPayload(currentUser.id);

  reportBox.textContent = "Generating Puter AI report...";

  const prompt = `
You are a careful fitness and wellness data analyst.

Analyze this Garmin-style health data and return only valid JSON.

Important rules:
- Do not diagnose disease.
- Do not claim medical certainty.
- Give wellness guidance only.
- If data is missing, say data is limited.
- Focus on body condition, recovery, weight-loss support, activity load, sleep, stress, resting heart rate, and training suggestion.

Return JSON exactly in this structure:

{
  "readiness_score": 1,
  "summary": "short summary",
  "report_json": {
    "wellness_note": "This is wellness guidance, not medical diagnosis.",
    "key_findings": [],
    "possible_concerns": [],
    "training_recommendation": "",
    "recovery_recommendation": "",
    "weight_management_note": "",
    "risk_level": "low"
  }
}

Score must be from 1 to 100.
risk_level must be low, medium, or high.

Health data:
${JSON.stringify(payload, null, 2)}
`;

  try {
    const aiResponse = await puter.ai.chat(prompt, {
      model: "gpt-4o-mini"
    });

    const aiText = extractPuterText(aiResponse);
    const parsed = parseAiJson(aiText);

    const readinessScore = Number(parsed.readiness_score || 50);

    const reportRow = {
      user_id: currentUser.id,
      report_date: new Date().toISOString().slice(0, 10),
      readiness_score: Math.max(1, Math.min(100, readinessScore)),
      summary: parsed.summary || "AI report generated.",
      report_json: parsed.report_json || {
        raw_response: aiText,
        wellness_note: "This is wellness guidance, not medical diagnosis."
      }
    };

    const { data, error } = await supabaseClient
      .from("ai_reports")
      .upsert(reportRow, {
        onConflict: "user_id,report_date"
      })
      .select()
      .single();

    if (error) {
      reportBox.textContent = error.message;
      return;
    }

    document.getElementById("readiness").textContent =
      `${data.readiness_score}%`;

    reportBox.textContent =
      `${data.summary}\n\n${JSON.stringify(data.report_json, null, 2)}`;

  } catch (error) {
    console.error(error);

    const fallback = createFallbackAnalysis(payload);

    await supabaseClient
      .from("ai_reports")
      .upsert({
        user_id: currentUser.id,
        report_date: new Date().toISOString().slice(0, 10),
        readiness_score: fallback.readiness_score,
        summary: fallback.summary,
        report_json: fallback.report_json
      }, {
        onConflict: "user_id,report_date"
      });

    document.getElementById("readiness").textContent =
      `${fallback.readiness_score}%`;

    reportBox.textContent =
      `${fallback.summary}\n\n${JSON.stringify(fallback.report_json, null, 2)}`;
  }
}

async function collectHealthPayload(userId) {
  const [
    profileResult,
    dailyResult,
    sleepResult,
    activitiesResult,
    bodyResult,
    trainingResult
  ] = await Promise.all([
    supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single(),

    supabaseClient
      .from("daily_health")
      .select("*")
      .eq("user_id", userId)
      .order("health_date", { ascending: false })
      .limit(14),

    supabaseClient
      .from("sleep_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("sleep_date", { ascending: false })
      .limit(14),

    supabaseClient
      .from("activities")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(20),

    supabaseClient
      .from("body_measurements")
      .select("*")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .limit(10),

    supabaseClient
      .from("training_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("metric_date", { ascending: false })
      .limit(14)
  ]);

  return {
    generated_at: new Date().toISOString(),
    profile: profileResult.data || null,
    daily_health: dailyResult.data || [],
    sleep_sessions: sleepResult.data || [],
    activities: activitiesResult.data || [],
    body_measurements: bodyResult.data || [],
    training_metrics: trainingResult.data || []
  };
}

function extractPuterText(response) {
  if (!response) return "";

  if (typeof response === "string") {
    return response;
  }

  if (response.message?.content) {
    return response.message.content;
  }

  if (response.text) {
    return response.text;
  }

  if (response.content) {
    return response.content;
  }

  return JSON.stringify(response);
}

function parseAiJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);

      if (match) {
        return JSON.parse(match[0]);
      }

      throw new Error("AI did not return valid JSON.");
    }
  }
}

function createFallbackAnalysis(payload) {
  const latestHealth = payload.daily_health?.[0];
  const latestSleep = payload.sleep_sessions?.[0];

  let score = 70;
  const findings = [];

  if (!latestHealth) {
    findings.push("Daily health data is missing.");
    score -= 10;
  }

  if (latestSleep?.duration_minutes && latestSleep.duration_minutes < 360) {
    findings.push("Sleep duration appears low.");
    score -= 15;
  }

  if (latestHealth?.resting_heart_rate && latestHealth.resting_heart_rate > 75) {
    findings.push("Resting heart rate appears elevated.");
    score -= 10;
  }

  if (latestHealth?.stress_average && latestHealth.stress_average > 60) {
    findings.push("Stress level appears high.");
    score -= 10;
  }

  if (latestHealth?.body_battery_low !== null && latestHealth?.body_battery_low < 20) {
    findings.push("Body battery dropped low.");
    score -= 10;
  }

  score = Math.max(1, Math.min(100, score));

  return {
    readiness_score: score,
    summary: findings.length
      ? findings.join(" ") + " Consider lighter training and better recovery today."
      : "Your latest wellness signals look generally stable.",
    report_json: {
      wellness_note: "This is wellness guidance, not medical diagnosis.",
      key_findings: findings,
      possible_concerns: [],
      training_recommendation: score < 60
        ? "Choose light recovery activity today."
        : "Moderate training is acceptable if you feel well.",
      recovery_recommendation: "Prioritize sleep, hydration, and balanced meals.",
      weight_management_note: "Maintain consistent calorie control and daily movement.",
      risk_level: score < 50 ? "medium" : "low"
    }
  };
}

async function saveBodyMeasurement() {
  const weight = document.getElementById("manualWeight").value;
  const bodyFat = document.getElementById("manualBodyFat").value;
  const msg = document.getElementById("measurementMessage");

  if (!currentUser) return;

  if (!weight) {
    msg.textContent = "Please enter weight.";
    return;
  }

  const { error } = await supabaseClient
    .from("body_measurements")
    .insert({
      user_id: currentUser.id,
      weight_kg: Number(weight),
      body_fat_percentage: bodyFat ? Number(bodyFat) : null
    });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  await supabaseClient
    .from("profiles")
    .update({
      current_weight_kg: Number(weight)
    })
    .eq("user_id", currentUser.id);

  msg.textContent = "Measurement saved.";
  document.getElementById("manualWeight").value = "";
  document.getElementById("manualBodyFat").value = "";

  await loadProfile(currentUser.id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}