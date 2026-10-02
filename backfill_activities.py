import os
import time
from datetime import date
from dotenv import load_dotenv
from garminconnect import Garmin
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD")
USER_ID = os.getenv("USER_ID")

GARMIN_TOKEN_STORE = os.getenv("GARMIN_TOKEN_STORE", "./garmin_tokens")
BATCH_SIZE = int(os.getenv("BACKFILL_BATCH_SIZE", "25"))
DELAY_SECONDS = int(os.getenv("BACKFILL_DELAY_SECONDS", "20"))
MAX_ACTIVITIES = int(os.getenv("BACKFILL_MAX_ACTIVITIES", "0"))

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


def garmin_login():
    api = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
    disable_fresh_login = os.getenv("GARMIN_DISABLE_FRESH_LOGIN", "0") == "1"

    try:
        if os.path.exists(GARMIN_TOKEN_STORE):
            print("Loading saved Garmin session...")
            api.garth.load(GARMIN_TOKEN_STORE)

            restore_garmin_identity(api)

            if not getattr(api, "display_name", None):
                raise Exception("Garmin display_name is missing after token load.")

            api.get_user_summary(date.today().isoformat())

            print("Garmin saved session works.")
            return api
        else:
            print(f"Garmin token store not found: {GARMIN_TOKEN_STORE}")

    except Exception as e:
        print(f"Saved Garmin session failed: {e}")

    if disable_fresh_login:
        raise Exception(
            "Fresh Garmin login is disabled in GitHub Actions. "
            "Create a new local garmin_tokens folder and update GARMIN_TOKENS_TGZ_BASE64."
        )

    print("Logging in to Garmin...")
    api.login()

    try:
        os.makedirs(GARMIN_TOKEN_STORE, exist_ok=True)
        api.garth.dump(GARMIN_TOKEN_STORE)
        print("Garmin session saved.")
    except Exception as e:
        print(f"Could not save Garmin session: {e}")

    return api


def get_activity_type(activity):
    activity_type = activity.get("activityType")

    if isinstance(activity_type, dict):
        return activity_type.get("typeKey") or str(activity_type.get("typeId"))

    if activity_type is None:
        return None

    return str(activity_type)


def upload_activity(activity):
    garmin_activity_id = str(activity.get("activityId") or "")

    if not garmin_activity_id:
        return False

    row = {
        "user_id": USER_ID,
        "garmin_activity_id": garmin_activity_id,
        "activity_type": get_activity_type(activity),
        "activity_name": activity.get("activityName"),
        "started_at": activity.get("startTimeGMT"),
        "duration_seconds": to_int(activity.get("duration")),
        "distance_m": to_float(activity.get("distance")),
        "calories": to_int(activity.get("calories")),
        "avg_heart_rate": to_int(activity.get("averageHR")),
        "max_heart_rate": to_int(activity.get("maxHR")),
        "raw_data": activity
    }

    db.table("activities").upsert(
        row,
        on_conflict="user_id,garmin_activity_id"
    ).execute()

    return True


def backfill_all_activities():
    print("Starting Garmin activities backfill...")
    log_sync("started", "Garmin all activities backfill started.")

    try:
        api = garmin_login()
    except Exception as e:
        log_sync("error", f"Garmin login failed: {e}")
        raise

    start = 0
    total_uploaded = 0

    while True:
        print(f"Fetching activities: start={start}, limit={BATCH_SIZE}")

        try:
            activities = api.get_activities(start, BATCH_SIZE)
        except Exception as e:
            message = str(e)

            print(f"Garmin fetch failed: {message}")
            log_sync("error", f"Garmin fetch failed at start={start}: {message}")

            if "429" in message or "Too Many" in message or "too many" in message:
                print("Garmin rate limit detected. Stop now and try again later.")
                log_sync("warning", "Garmin 429 rate limit detected. Backfill stopped.")
                break

            raise

        if not activities:
            print("No more activities found.")
            break

        for activity in activities:
            if MAX_ACTIVITIES > 0 and total_uploaded >= MAX_ACTIVITIES:
                print(f"Stopped because MAX_ACTIVITIES={MAX_ACTIVITIES}")
                log_sync("success", f"Backfill stopped at MAX_ACTIVITIES={MAX_ACTIVITIES}")
                return

            try:
                uploaded = upload_activity(activity)

                if uploaded:
                    total_uploaded += 1
                    print(
                        f"Uploaded/updated #{total_uploaded}: "
                        f"{activity.get('activityName')} "
                        f"({activity.get('activityId')})"
                    )

            except Exception as e:
                print(f"Upload failed for activity {activity.get('activityId')}: {e}")
                log_sync(
                    "error",
                    f"Upload failed for activity {activity.get('activityId')}: {e}"
                )

        start += BATCH_SIZE

        print(f"Waiting {DELAY_SECONDS} seconds to avoid Garmin rate limit...")
        time.sleep(DELAY_SECONDS)

    log_sync(
        "success",
        f"Garmin activities backfill completed. Uploaded/updated: {total_uploaded}"
    )

    print(f"Backfill completed. Uploaded/updated: {total_uploaded}")


if __name__ == "__main__":
    backfill_all_activities()