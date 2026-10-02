let currentUser = null;
window.dashboardDataset = { profile: null, daily: [], sleep: [], activities: [], body: [], training: [], reports: [] };

const byId = id => document.getElementById(id);
const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value; };

window.addEventListener("error", () => hidePageLoader());
window.addEventListener("unhandledrejection", () => hidePageLoader());

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("dashboard-page")) return;

  const loaderFailsafe = window.setTimeout(hidePageLoader, 10000);
  window.__loaderFailsafe = loaderFailsafe;

  initializeDashboard();
  byId("measurementForm")?.addEventListener("submit", saveMeasurement);
  byId("profileForm")?.addEventListener("submit", saveProfile);
  byId("generateAiButton")?.addEventListener("click", requestAiAnalysis);
  byId("syncRefreshButton")?.addEventListener("click", () => loadDashboard(true));
  byId("trendRange")?.addEventListener("change", () => renderCharts(window.dashboardDataset));
  byId("mobileLogoutButton")?.addEventListener("click", logout);
  byId("closeActivity")?.addEventListener("click", closeActivityDetail);
  byId("activityBackdrop")?.addEventListener("click", closeActivityDetail);
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => filterActivities(button));
  });
});

function hidePageLoader() {
  const loader = byId("pageLoader");
  if (!loader) return;
  loader.classList.add("hidden");
  window.setTimeout(() => { loader.style.display = "none"; }, 350);
  if (window.__loaderFailsafe) clearTimeout(window.__loaderFailsafe);
}

async function initializeDashboard() {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) {
      location.replace("./index.html");
      return;
    }

    currentUser = user;
    await supabaseClient.from("profiles").upsert({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || user.email.split("@")[0]
    }, { onConflict: "user_id", ignoreDuplicates: true });

    await loadDashboard();
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    showToast(error.message || "Unable to load dashboard.", "error");
    hidePageLoader();
  }
}

async function queryMany(table, orderColumn, limit = 30) {
  const { data, error } = await supabaseClient.from(table).select("*")
    .eq("user_id", currentUser.id).order(orderColumn, { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function loadDashboard(showNotice = false) {
  byId("pageLoader")?.classList.remove("hidden");
  if (byId("pageLoader")) byId("pageLoader").style.display = "grid";

  try {
    const [profileResult, daily, sleep, activities, body, training, reports] = await Promise.all([
      supabaseClient.from("profiles").select("*").eq("user_id", currentUser.id).maybeSingle(),
      queryMany("daily_health", "health_date"),
      queryMany("sleep_sessions", "sleep_date"),
      queryMany("activities", "started_at"),
      queryMany("body_measurements", "measured_at"),
      queryMany("training_metrics", "metric_date"),
      queryMany("ai_reports", "created_at", 1)
    ]);

    if (profileResult.error) throw profileResult.error;
    window.dashboardDataset = { profile: profileResult.data, daily, sleep, activities, body, training, reports };
    renderDashboard(window.dashboardDataset);
    if (typeof loadNutrition === "function") await loadNutrition();
    if (showNotice) showToast("Dashboard refreshed");
  } catch (error) {
    console.error("Dashboard load failed:", error);
    showToast(error.message || "Unable to load dashboard data.", "error");
  } finally {
    hidePageLoader();
  }
}
window.loadDashboard = loadDashboard;

function renderDashboard(data) {
  const profile = data.profile || {};
  const health = data.daily[0] || {};
  const sleep = data.sleep[0] || {};
  const body = data.body[0] || {};
  const weight = Number(body.weight_kg || profile.current_weight_kg) || 0;
  const profileName = String(profile.full_name || currentUser.user_metadata?.full_name || "User").trim();
  const firstName = profileName.split(/\s+/)[0];
  const hour = new Date().getHours();

  setText("sideName", profileName);
  setText("sideEmail", currentUser.email);
  setText("avatarInitial", firstName.charAt(0).toUpperCase() || "U");
  setText("greeting", `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, ${firstName}`);
  setText("dashboardDate", new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }));
  setText("steps", health.steps != null ? Number(health.steps).toLocaleString() : "-");
  setText("calories", health.active_calories != null ? Number(health.active_calories).toLocaleString() : "-");
  setText("sleep", sleep.duration_minutes ? formatDuration(sleep.duration_minutes) : "-");
  setText("sleepScore", sleep.sleep_score ? `Sleep score ${sleep.sleep_score}` : "latest session");
  setText("rhr", health.resting_heart_rate ?? "-");
  setText("battery", health.body_battery_high ?? "-");
  setText("batteryRange", health.body_battery_low != null ? `Range ${health.body_battery_low}-${health.body_battery_high}` : "");
  setText("stress", health.stress_average ?? "-");
  setText("stressLabel", getStressLabel(health.stress_average));

  const stepsProgress = byId("stepsProgress");
  if (stepsProgress) stepsProgress.style.width = `${Math.min(100, (Number(health.steps) || 0) / APP_CONFIG.DAILY_STEP_GOAL * 100)}%`;
  const caloriesProgress = byId("calProgress");
  if (caloriesProgress) caloriesProgress.style.width = `${Math.min(100, (Number(health.active_calories) || 0) / 600 * 100)}%`;

  const bmi = weight && profile.height_cm ? weight / Math.pow(Number(profile.height_cm) / 100, 2) : 0;
  setText("bmi", bmi ? bmi.toFixed(1) : "-");
  setText("bmiLabel", bmi ? getBmiCategory(bmi) : "height required");

  renderGoal(profile, weight, data.body);
  renderReadiness(health, sleep);
  renderProfile(profile);
  renderActivities(data.activities);
  renderHomeActivity(data.activities[0]);
  if (data.reports[0] && typeof renderAiReport === "function") renderAiReport(data.reports[0]);
}

function renderGoal(profile, current, measurements) {
  const target = Number(profile.target_weight_kg) || 0;
  const start = Number(measurements.at(-1)?.weight_kg || current);
  const remaining = current && target ? Math.max(0, current - target) : 0;
  const percentage = start && target ? Math.max(0, Math.min(100, Math.round((start - current) / Math.max(0.1, start - target) * 100))) : 0;
  setText("goalCurrent", current ? `${current.toFixed(1)} kg` : "-");
  setText("targetWeight", target ? `${target.toFixed(1)} kg` : "-");
  setText("weightRemaining", current && target ? `${remaining.toFixed(1)} kg` : "-");
  setText("goalPercent", `${percentage}%`);
  if (byId("goalProgress")) byId("goalProgress").style.width = `${percentage}%`;
  setText("goalMessage", current && target ? `${remaining.toFixed(1)} kg remaining to target` : "Complete profile to calculate progress");
}

function renderReadiness(health, sleep) {
  if (!Object.keys(health).length && !Object.keys(sleep).length) return;
  let score = 70;
  if (sleep.duration_minutes >= 420) score += 10;
  else if (sleep.duration_minutes && sleep.duration_minutes < 360) score -= 15;
  if (health.resting_heart_rate > 75) score -= 10;
  if (health.stress_average > 60) score -= 12;
  else if (health.stress_average < 40) score += 7;
  if (health.body_battery_low < 20) score -= 10;
  if (health.body_battery_high >= 70) score += 5;
  score = Math.max(1, Math.min(100, score));

  setText("readiness", `${score}%`);
  setText("readinessTitle", score >= 80 ? "Ready to perform" : score >= 60 ? "Balanced day" : "Recovery first");
  setText("readinessText", score >= 80 ? "Strong recovery signals. Train normally if you feel well." : score >= 60 ? "Keep intensity moderate and respond to how your body feels." : "Choose lighter movement and prioritize sleep, hydration and food quality.");
  byId("readinessRing")?.style.setProperty("--score", score);
}

function renderHomeActivity(activity) {
  const container = byId("homeActivity");
  if (!container) return;
  container.innerHTML = activity ? buildActivityCard(activity, 0, true) : '<div class="empty-state">No activities synced yet.</div>';
  container.querySelector("button")?.addEventListener("click", () => openActivityDetail(activity));
}

function renderActivities(items) {
  window.filteredActivities = items;
  const distanceKm = items.reduce((sum, item) => sum + (Number(item.distance_m) || 0), 0) / 1000;
  setText("activitySummary", `${items.length} sessions • ${distanceKm.toFixed(1)} km total`);
  setText("monthDistance", `${distanceKm.toFixed(1)} km`);
  const grid = byId("activitiesGrid");
  if (!grid) return;
  grid.innerHTML = items.map((activity, index) => buildActivityCard(activity, index)).join("") || '<div class="empty-state card">No activities synced.</div>';
  grid.querySelectorAll("[data-index]").forEach(button => button.addEventListener("click", () => openActivityDetail(items[Number(button.dataset.index)])));
}

function buildActivityCard(activity, index, small = false) {
  const type = formatActivityType(activity.activity_type);
  const pace = calculateActivityPace(activity);
  return `<button class="activity-card ${getActivityClass(type)} ${small ? "small" : ""}" data-index="${index}">
    <div class="activity-banner"><span>${getActivityIcon(type)}</span><div><small>${escapeHtml(type)}</small><h3>${escapeHtml(activity.activity_name || type)}</h3><p>${formatDateTime(activity.started_at)}</p></div><em>›</em></div>
    <div class="activity-metrics"><span><small>Distance</small><b>${activity.distance_m ? `${(Number(activity.distance_m) / 1000).toFixed(2)} km` : "-"}</b></span><span><small>Time</small><b>${activity.duration_seconds ? formatDuration(Math.round(Number(activity.duration_seconds) / 60)) : "-"}</b></span><span><small>Pace</small><b>${pace}</b></span><span><small>Avg HR</small><b>${activity.avg_heart_rate ? `${activity.avg_heart_rate} bpm` : "-"}</b></span></div>
  </button>`;
}

function filterActivities(button) {
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
  const filter = button.dataset.filter;
  const source = window.dashboardDataset.activities;
  const list = filter === "all" ? source : source.filter(activity => getActivityClass(formatActivityType(activity.activity_type)) === filter);
  renderActivities(list);
}

function openActivityDetail(activity) {
  if (!activity) return;
  const type = formatActivityType(activity.activity_type);
  const raw = activity.raw_data || {};
  byId("activityDetail").innerHTML = `<div class="detail-hero ${getActivityClass(type)}"><span>${getActivityIcon(type)}</span><p class="overline">${escapeHtml(type)}</p><h2>${escapeHtml(activity.activity_name || type)}</h2><small>${formatDateTime(activity.started_at)}</small></div><div class="detail-primary"><span><b>${activity.distance_m ? (Number(activity.distance_m) / 1000).toFixed(2) : "-"}</b><small>KM</small></span><span><b>${activity.duration_seconds ? formatDuration(Math.round(Number(activity.duration_seconds) / 60)) : "-"}</b><small>TIME</small></span><span><b>${activity.calories || "-"}</b><small>KCAL</small></span></div><div class="detail-grid"><span>Average pace<b>${calculateActivityPace(activity)}</b></span><span>Average HR<b>${activity.avg_heart_rate ? `${activity.avg_heart_rate} bpm` : "-"}</b></span><span>Maximum HR<b>${activity.max_heart_rate ? `${activity.max_heart_rate} bpm` : "-"}</b></span><span>Elevation gain<b>${raw.elevationGain ? `${Math.round(raw.elevationGain)} m` : "-"}</b></span></div>`;
  byId("activitySheet")?.classList.add("open");
  byId("activityBackdrop")?.classList.add("open");
}

function closeActivityDetail() { byId("activitySheet")?.classList.remove("open"); byId("activityBackdrop")?.classList.remove("open"); }
function renderProfile(profile) { byId("profileName").value = profile.full_name || ""; byId("profileDob").value = profile.date_of_birth || ""; byId("profileHeight").value = profile.height_cm || ""; byId("profileTarget").value = profile.target_weight_kg || ""; byId("profileGoal").value = profile.primary_goal || "weight_loss"; }

async function saveMeasurement(event) {
  event.preventDefault(); const button = event.submitter; const weight = Number(byId("manualWeight").value); const fat = Number(byId("manualBodyFat").value) || null;
  setBusy(button, true, "Saving..."); const { error } = await supabaseClient.from("body_measurements").insert({ user_id: currentUser.id, weight_kg: weight, body_fat_percentage: fat });
  if (!error) await supabaseClient.from("profiles").update({ current_weight_kg: weight }).eq("user_id", currentUser.id);
  setBusy(button, false); setMessage("measurementMessage", error?.message || "Measurement saved", error ? "error" : "success"); if (!error) { event.target.reset(); loadDashboard(); }
}

async function saveProfile(event) {
  event.preventDefault(); const button = event.submitter; const update = { full_name: byId("profileName").value.trim(), date_of_birth: byId("profileDob").value || null, height_cm: Number(byId("profileHeight").value) || null, target_weight_kg: Number(byId("profileTarget").value) || null, primary_goal: byId("profileGoal").value };
  setBusy(button, true, "Saving..."); const { error } = await supabaseClient.from("profiles").update(update).eq("user_id", currentUser.id); setBusy(button, false); setMessage("profileMessage", error?.message || "Profile saved", error ? "error" : "success"); if (!error) loadDashboard();
}

function setMessage(id, value, type) { const el = byId(id); if (el) { el.textContent = value; el.className = `message ${type}`; } }
function text(id, value) { setText(id, value); }
function formatDuration(minutes) { const m = Number(minutes) || 0; return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }
function formatDateTime(value) { if (!value) return "Unknown date"; return new Date(String(value).includes("T") ? value : String(value).replace(" ", "T") + "Z").toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function capitalize(value) { return String(value || "").replace(/^./, char => char.toUpperCase()); }
function formatActivityType(value) { return String(value || "Other").replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase()); }
function getActivityClass(type) { const value = type.toLowerCase(); return value.includes("run") ? "run" : value.includes("cycl") || value.includes("bike") ? "cycle" : value.includes("walk") || value.includes("hike") ? "walk" : "other"; }
function getActivityIcon(type) { const value = getActivityClass(type); return value === "run" ? "🏃" : value === "cycle" ? "🚴" : value === "walk" ? "🚶" : "🏋"; }
function calculateActivityPace(activity) { if (!activity.distance_m || !activity.duration_seconds) return "-"; const seconds = Number(activity.duration_seconds) / (Number(activity.distance_m) / 1000); return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")} /km`; }
function getStressLabel(value) { return value == null ? "No status" : value < 26 ? "Low" : value < 51 ? "Balanced" : value < 76 ? "High" : "Very high"; }
function getBmiCategory(value) { return value < 18.5 ? "Below range" : value < 25 ? "Standard range" : value < 30 ? "Above range" : "High range"; }
function applyReadiness(score, description) { setText("readiness", `${score}%`); setText("readinessText", description); }
