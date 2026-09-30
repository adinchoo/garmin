import os
from datetime import date, timedelta
from dotenv import load_dotenv
from garminconnect import Garmin
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD")
USER_ID = os.getenv("USER_ID")
DAYS_BACK = int(os.getenv("DAYS_BACK", "14"))

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GARMIN_EMAIL, GARMIN_PASSWORD, USER_ID]):
    raise Exception("Missing environment variables.")

db = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def to_int(v):
    try:
        if v is None:
            return None
        return int(v)
    except Exception:
        return None

def to_float(v):
    try:
        if v is None:
            return None
        return float(v)
    except Exception:
        return None

def log(status, message):
    db.table("sync_logs").insert({
        "user_id": USER_ID,
        "source_system": "garmin",
        "status": status,
        "message": message
    }).execute()

def sync_daily(api, d):
    ds = d.isoformat()

    try:
        summary = api.get_user_summary(ds)
    except Exception as e:
        log("warning", f"Daily health failed {ds}: {e}")
        return

    moderate = to_int(summary.get("moderateIntensityMinutes")) or 0
    vigorous = to_int(summary.get("vigorousIntensityMinutes")) or 0

    row = {
        "user_id": USER_ID,
        "health_date": ds,
        "steps": to_int(summary.get("totalSteps")) or 0,
        "distance_m": to_float(summary.get("totalDistanceMeters")),
        "resting_heart_rate": to_int(summary.get("restingHeartRate")),
        "avg_heart_rate": to_int(summary.get("averageHeartRate")),
        "max_heart_rate": to_int(summary.get("maxHeartRate")),
        "stress_average": to_int(summary.get("averageStressLevel")),
        "active_calories": to_int(summary.get("activeKilocalories")),
        "total_calories": to_int(summary.get("totalKilocalories")),
        "intensity_minutes": moderate + vigorous
    }

    try:
        battery = api.get_body_battery(ds)
        values = []

        if isinstance(battery, list):
            for item in battery:
                value = item.get("bodyBatteryLevel")
                if value is not None:
                    values.append(value)

        if values:
            row["body_battery_high"] = max(values)
            row["body_battery_low"] = min(values)
    except Exception:
        pass

    db.table("daily_health").upsert(
        row,
        on_conflict="user_id,health_date"
    ).execute()

def sync_sleep(api, d):
    ds = d.isoformat()

    try:
        sleep = api.get_sleep_data(ds)
    except Exception as e:
        log("warning", f"Sleep failed {ds}: {e}")
        return

    daily = sleep.get("dailySleepDTO") or {}
    scores = daily.get("sleepScores") or {}

    row = {
        "user_id": USER_ID,
        "sleep_date": ds,
        "duration_minutes": to_int((daily.get("sleepTimeSeconds") or 0) / 60),
        "deep_sleep_minutes": to_int((daily.get("deepSleepSeconds") or 0) / 60),
        "light_sleep_minutes": to_int((daily.get("lightSleepSeconds") or 0) / 60),
        "rem_sleep_minutes": to_int((daily.get("remSleepSeconds") or 0) / 60),
        "awake_minutes": to_int((daily.get("awakeSleepSeconds") or 0) / 60),
        "sleep_score": to_int((scores.get("overall") or {}).get("value"))
    }

    db.table("sleep_sessions").upsert(
        row,
        on_conflict="user_id,sleep_date"
    ).execute()

def sync_activities(api, start, end):
    try:
        activities = api.get_activities_by_date(start.isoformat(), end.isoformat())
    except Exception as e:
        log("warning", f"Activities failed: {e}")
        return

    for a in activities:
        garmin_id = str(a.get("activityId") or "")

        if not garmin_id:
            continue

        activity_type = None
        if isinstance(a.get("activityType"), dict):
            activity_type = a.get("activityType", {}).get("typeKey")

        row = {
            "user_id": USER_ID,
            "garmin_activity_id": garmin_id,
            "activity_type": activity_type,
            "activity_name": a.get("activityName"),
            "started_at": a.get("startTimeGMT"),
            "duration_seconds": to_int(a.get("duration")),
            "distance_m": to_float(a.get("distance")),
            "calories": to_int(a.get("calories")),
            "avg_heart_rate": to_int(a.get("averageHR")),
            "max_heart_rate": content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function fallbackAnalysis(payload: any) {
  const h = payload.daily_health?.[0];
  const s = payload.sleep_sessions?.[0];

  let score = 70;
  const findings: string[] = [];

  if (s?.duration_minutes && s.duration_minutes < 360) {
    score -= 15;
    findings.push("Sleep duration is low.");
  }

  if (h?.resting_heart_rate && h.resting_heart_rate > 75) {
    score -= 10;
    findings.push("Resting heart rate is elevated.");
  }

  if (h?.stress_average && h.stress_average > 60) {
    score -= 10;
    findings.push("Stress level is high.");
  }

  if (h?.body_battery_low !== null && h?.body_battery_low < 20) {
    score -= 10;
    findings.push("Body battery dropped low.");
  }

  score = Math.max(1, Math.min(100, score));

  return {
    readiness_score: score,
    summary: findings.length
      ? findings.join(" ") + " Consider easier training and more recovery today."
      : "Your latest wellness signals look generally stable.",
    report_json: {
      wellness_note: "This is wellness guidance, not medical diagnosis.",
      key_findings: findings,
      training_recommendation: score < 60 ? "Light recovery activity." : "Moderate training is acceptable if you feel well.",
      recovery_recommendation: "Prioritize sleep, hydration, and balanced food.",
      risk_level: score < 50 ? "medium" : "low"
    }
  };
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const reportDate = body.report_date || new Date().toISOString().slice(0, 10);

    const [daily, sleep, activities, bodyMeasurements, training] =
      await Promise.all([
        supabase.from("daily_health").select("*").eq("user_id", userId).order("health_date", { ascending: false }).limit(14),
        supabase.from("sleep_sessions").select("*").eq("user_id", userId).order("sleep_date", { ascending: false }).limit(14),
        supabase.from("activities").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(20),
        supabase.from("body_measurements").select("*").eq("user_id", userId).order("measured_at", { ascending: false }).limit(10),
        supabase.from("training_metrics").select("*").eq("user_id", userId).order("metric_date", { ascending: false }).limit(14)
      ]);

    const payload = {
      report_date: reportDate,
      daily_health: daily.data || [],
      sleep_sessions: sleep.data || [],
      activities: activities.data || [],
      body_measurements: bodyMeasurements.data || [],
      training_metrics: training.data || []
    };

    let result = fallbackAnalysis(payload);

    if (openAiKey) {
      const prompt = `
Return only valid JSON.

Analyze this Garmin wellness data. Do not diagnose disease.

Required JSON:
{
  "readiness_score": 1-100,
  "summary": "short summary",
  "report_json": {
    "wellness_note": "This is wellness guidance, not medical diagnosis.",
    "key_findings": [],
    "possible_concerns": [],
    "training_recommendation": "",
    "recovery_recommendation": "",
    "weight_management_note": "",
    "risk_level": "low|medium|high"
  }
}

Data:
${JSON.stringify(payload)}
`;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a careful wellness data analyst. Never provide medical diagnosis."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2
        })
      });

      if (aiResponse.ok) {
        const aiJson = await aiResponse.json();
        const text = aiJson.choices?.[0]?.message?.content || "";

        try {
          result = JSON.parse(text);
        } catch {
          result = fallbackAnalysis(payload);
        }
      }
    }

    const { data: saved, error: saveError } = await supabase
      .from("ai_reports")
      .upsert({
        user_id: userId,
        report_date: reportDate,
        readiness_score: result.readiness_score,
        summary: result.summary,
        report_json: result.report_json
      }, {
        onConflict: "user_id,report_date"
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: String(error?.message || error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});