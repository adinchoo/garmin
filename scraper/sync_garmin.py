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
DAYS_BACK = int(os.getenv("DAYS_BACK", "3"))

if not all([
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    GARMIN_EMAIL,
    GARMIN_PASSWORD,
    USER_ID
]):
    raise Exception("Missing environment variables. Check scraper/.env")

db = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def to_int(value):
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def to_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except Exception:
        return None


def log_sync(status, message):
    try:
        db.table("sync_logs").insert({
            "user_id": USER_ID,
            "source_system": "garmin",
            "status": status,
            "message": message
        }).execute()
    except Exception as e:
        print(f"Sync log failed: {e}")


def sync_daily_health(api, target_date):
    date_string = target_date.isoformat()
    print(f"Syncing daily health: {date_string}")

    try:
        summary = api.get_user_summary(date_string)
    except Exception as e:
        log_sync("warning", f"Daily health failed for {date_string}: {e}")
        print(f"Daily health failed for {date_string}: {e}")
        return

    moderate = to_int(summary.get("moderateIntensityMinutes")) or 0
    vigorous = to_int(summary.get("vigorousIntensityMinutes")) or 0

    row = {
        "user_id": USER_ID,
        "health_date": date_string,
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
        battery = api.get_body_battery(date_string)
        values = []

        if isinstance(battery, list):
            for item in battery:
                value = item.get("bodyBatteryLevel")
                if value is not None:
                    values.append(value)

        if values:
            row["body_battery_high"] = max(values)
            row["body_battery_low"] = min(values)

    except Exception as e:
        print(f"Body battery not available for {date_string}: {e}")

    try:
        db.table("daily_health").upsert(
            row,
            on_conflict="user_id,health_date"
        ).execute()
        print(f"Daily health synced: {date_string}")
    except Exception as e:
        log_sync("error", f"Supabase daily_health insert failed for {date_string}: {e}")
        print(f"Supabase daily_health insert failed: {e}")


def sync_sleep(api, target_date):
    date_string = target_date.isoformat()
    print(f"Syncing sleep: {date_string}")

    try:
        sleep = api.get_sleep_data(date_string)
    except Exception as e:
        log_sync("warning", f"Sleep failed for {date_string}: {e}")
        print(f"Sleep failed for {date_string}: {e}")
        return

    daily = sleep.get("dailySleepDTO") or {}
    scores = daily.get("sleepScores") or {}
    overall_score = scores.get("overall") or {}

    row = {
        "user_id": USER_ID,
        "sleep_date": date_string,
        "duration_minutes": to_int((daily.get("sleepTimeSeconds") or 0) / 60),
        "deep_sleep_minutes": to_int((daily.get("deepSleepSeconds") or 0) / 60),
        "light_sleep_minutes": to_int((daily.get("lightSleepSeconds") or 0) / 60),
        "rem_sleep_minutes": to_int((daily.get("remSleepSeconds") or 0) / 60),
        "awake_minutes": to_int((daily.get("awakeSleepSeconds") or 0) / 60),
        "sleep_score": to_int(overall_score.get("value"))
    }

    try:
        db.table("sleep_sessions").upsert(
            row,
            on_conflict="user_id,sleep_date"
        ).execute()
        print(f"Sleep synced: {date_string}")
    except Exception as e:
        log_sync("error", f"Supabase sleep insert failed for {date_string}: {e}")
        print(f"Supabase sleep insert failed: {e}")


def sync_activities(api, start_date, end_date):
    print(f"Syncing activities from {start_date} to {end_date}")

    try:
        activities = api.get_activities_by_date(
            start_date.isoformat(),
            end_date.isoformat()
        )
    except Exception as e:
        log_sync("warning", f"Activities failed: {e}")
        print(f"Activities failed: {e}")
        return

    if not activities:
        print("No activities found.")
        return

    for activity in activities:
        garmin_activity_id = str(activity.get("activityId") or "")

        if not garmin_activity_id:
            continue

        activity_type = None

        if isinstance(activity.get("activityType"), dict):
            activity_type = activity.get("activityType", {}).get("typeKey")

        row = {
            "user_id": USER_ID,
            "garmin_activity_id": garmin_activity_id,
            "activity_type": activity_type,
            "activity_name": activity.get("activityName"),
            "started_at": activity.get("startTimeGMT"),
            "duration_seconds": to_int(activity.get("duration")),
            "distance_m": to_float(activity.get("distance")),
            "calories": to_int(activity.get("calories")),
            "avg_heart_rate": to_int(activity.get("averageHR")),
            "max_heart_rate": to_int(activity.get("maxHR")),
            "raw_data": activity
        }

        try:
            db.table("activities").upsert(
                row,
                on_conflict="user_id,garmin_activity_id"
            ).execute()

            print(f"Activity synced: {activity.get('activityName')}")

        except Exception as e:
            log_sync(
                "error",
                f"Supabase activity insert failed for {garmin_activity_id}: {e}"
            )
            print(f"Supabase activity insert failed: {e}")


def garmin_login():
    token_store = os.getenv("GARMIN_TOKEN_STORE", "./garmin_tokens")

    api = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)

    # Try saved Garmin session first
    try:
        if os.path.exists(token_store):
            print("Loading saved Garmin session...")
            api.garth.load(token_store)

            # Test session
            api.get_user_summary(date.today().isoformat())
            print("Garmin saved session works.")
            return api
    except Exception as e:
        print(f"Saved Garmin session failed: {e}")

    # Fresh login only if saved session fails
    print("Logging in to Garmin...")
    api.login()

    try:
        os.makedirs(token_store, exist_ok=True)
        api.garth.dump(token_store)
        print("Garmin session saved.")
    except Exception as e:
        print(f"Could not save Garmin session: {e}")

    return api


def main():
    print("Garmin sync started.")
    log_sync("started", "Garmin sync started.")

    try:
        api = garmin_login()
        print("Garmin login successful.")
    except Exception as e:
        log_sync("error", f"Garmin login failed: {e}")
        raise Exception(f"Garmin login failed: {e}")

    end_date = date.today()
    start_date = end_date - timedelta(days=DAYS_BACK)

    for i in range(DAYS_BACK + 1):
        target_date = start_date + timedelta(days=i)
        sync_daily_health(api, target_date)
        sync_sleep(api, target_date)

    sync_activities(api, start_date, end_date)

    log_sync("success", "Garmin sync completed.")
    print("Garmin sync completed.")


if __name__ == "__main__":
    main()