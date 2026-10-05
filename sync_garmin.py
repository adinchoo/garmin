import os
import io
import base64
import shutil
import tarfile
from pathlib import Path
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
    USER_ID
]):
    raise Exception(
        "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or USER_ID."
    )

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


GARMIN_TOKEN_STORE = Path(
    os.getenv("GARMIN_TOKEN_STORE", "./garmin_tokens")
)
GARMIN_TOKEN_SECRET = "GARMIN_TOKENS_TGZ_BASE64"


def token_files_exist(token_directory):
    token_directory = Path(token_directory)
    oauth1 = token_directory / "oauth1_token.json"
    oauth2 = token_directory / "oauth2_token.json"
    return (
        oauth1.is_file()
        and oauth2.is_file()
        and oauth1.stat().st_size > 0
        and oauth2.stat().st_size > 0
    )


def safe_extract_tar(archive, destination):
    destination = Path(destination).resolve()
    for member in archive.getmembers():
        target = (destination / member.name).resolve()
        if target != destination and destination not in target.parents:
            raise RuntimeError(
                f"Unsafe path in Garmin token archive: {member.name}"
            )
    archive.extractall(destination)


def find_token_directory(root):
    root = Path(root)
    candidates = [root / "garmin_tokens", root]
    candidates.extend(path.parent for path in root.rglob("oauth1_token.json"))

    checked = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in checked:
            continue
        checked.add(resolved)
        if token_files_exist(candidate):
            return candidate
    return None


def restore_garmin_tokens_from_secret():
    """Restore Garmin tokens from the Base64 GitHub secret."""
    encoded = os.getenv(GARMIN_TOKEN_SECRET, "").strip()
    if not encoded:
        print(
            f"{GARMIN_TOKEN_SECRET} is empty. "
            "Trying cached tokens or fresh login."
        )
        return False

    temporary_directory = Path("./garmin_token_restore_temp")
    print("Restoring Garmin tokens from GitHub Secret...")

    try:
        normalized = "".join(encoded.split())
        try:
            archive_bytes = base64.b64decode(normalized, validate=True)
        except Exception as error:
            raise RuntimeError(f"Invalid Base64 token secret: {error}") from error

        if len(archive_bytes) < 100:
            raise RuntimeError("Decoded Garmin token archive is too small.")

        shutil.rmtree(temporary_directory, ignore_errors=True)
        temporary_directory.mkdir(parents=True, exist_ok=True)

        with tarfile.open(
            fileobj=io.BytesIO(archive_bytes),
            mode="r:gz"
        ) as archive:
            safe_extract_tar(archive, temporary_directory)

        source_directory = find_token_directory(temporary_directory)
        if source_directory is None:
            files = sorted(
                str(path.relative_to(temporary_directory))
                for path in temporary_directory.rglob("*")
                if path.is_file()
            )
            raise RuntimeError(
                "Archive does not contain oauth1_token.json and "
                f"oauth2_token.json. Files found: {files}"
            )

        # Do not remove valid cached tokens until the secret archive is valid.
        shutil.rmtree(GARMIN_TOKEN_STORE, ignore_errors=True)
        GARMIN_TOKEN_STORE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source_directory, GARMIN_TOKEN_STORE)

        if not token_files_exist(GARMIN_TOKEN_STORE):
            raise RuntimeError("Extracted Garmin tokens failed validation.")

        print("Garmin tokens restored successfully from GitHub Secret.")
        return True

    except Exception as error:
        print(
            "Secret token restoration failed: "
            f"{type(error).__name__}: {error}"
        )
        print("Continuing with cached tokens or fresh login.")
        return False

    finally:
        shutil.rmtree(temporary_directory, ignore_errors=True)


def verify_garmin_session(api):
    """Verify authentication without requiring display_name restoration."""
    checks = []
    for name in ("get_full_name", "get_user_profile", "get_devices"):
        method = getattr(api, name, None)
        if callable(method):
            checks.append((name, method))

    errors = []
    for name, method in checks:
        try:
            result = method()
            if result is not None:
                print(f"Garmin session verified using {name}.")
                return
        except Exception as error:
            errors.append(f"{name}: {type(error).__name__}: {error}")

    # Last check for older garminconnect versions. It may require display_name.
    try:
        profile = getattr(api.garth, "profile", None) or {}
        display_name = (
            profile.get("displayName")
            or profile.get("display_name")
            or profile.get("userName")
            or profile.get("username")
        )
        if display_name:
            api.display_name = display_name
            api.get_user_summary(date.today().isoformat())
            print("Garmin session verified using the daily summary.")
            return
    except Exception as error:
        errors.append(
            f"daily summary: {type(error).__name__}: {error}"
        )

    details = " | ".join(errors) if errors else "No verification method succeeded."
    raise RuntimeError(f"Saved Garmin session verification failed. {details}")


def load_saved_garmin_session():
    if not token_files_exist(GARMIN_TOKEN_STORE):
        print(
            f"No complete Garmin token set found in {GARMIN_TOKEN_STORE}."
        )
        return None

    print(f"Loading saved Garmin session from {GARMIN_TOKEN_STORE}...")
    try:
        api = Garmin()
        api.garth.load(str(GARMIN_TOKEN_STORE))
        verify_garmin_session(api)
        print("Saved Garmin session works.")
        return api
    except Exception as error:
        print(
            "Saved Garmin session failed: "
            f"{type(error).__name__}: {error}"
        )
        return None


def fresh_garmin_login():
    if not GARMIN_EMAIL or not GARMIN_PASSWORD:
        raise RuntimeError(
            "GARMIN_EMAIL or GARMIN_PASSWORD is missing, so fresh login "
            "cannot be attempted."
        )

    print("Attempting fresh Garmin login using GitHub Secrets...")
    api = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
    api.login()
    verify_garmin_session(api)

    GARMIN_TOKEN_STORE.mkdir(parents=True, exist_ok=True)
    api.garth.dump(str(GARMIN_TOKEN_STORE))
    print(f"Refreshed Garmin tokens saved to {GARMIN_TOKEN_STORE}.")
    return api


def garmin_login():
    """
    Authentication order:
      1. Restore tokens from GARMIN_TOKENS_TGZ_BASE64.
      2. Use existing/cached garmin_tokens if secret restoration fails.
      3. Use GARMIN_EMAIL and GARMIN_PASSWORD as the final fallback.
    """
    cached_tokens_available = token_files_exist(GARMIN_TOKEN_STORE)
    if cached_tokens_available:
        print("Cached Garmin token folder detected.")

    restored = restore_garmin_tokens_from_secret()
    if restored:
        print("Using tokens restored from the GitHub Secret.")
    elif cached_tokens_available:
        print("Using cached Garmin tokens.")

    api = load_saved_garmin_session()
    if api is not None:
        return api

    allow_fresh_login = os.getenv(
        "GARMIN_ALLOW_FRESH_LOGIN", "1"
    ).strip().lower() in {"1", "true", "yes", "on"}

    if not allow_fresh_login:
        raise RuntimeError(
            "Saved Garmin tokens failed and fresh login is disabled. "
            "Set GARMIN_ALLOW_FRESH_LOGIN=1 or update "
            "GARMIN_TOKENS_TGZ_BASE64."
        )

    try:
        return fresh_garmin_login()
    except Exception as error:
        raise RuntimeError(
            "All Garmin authentication methods failed. "
            f"Final error: {type(error).__name__}: {error}"
        ) from error

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