import os
from datetime import date, timedelta
from dotenv import load_dotenv
from garminconnect import Garmin
from supabase import create_client
load_dotenv()
SUPABASE_URL=os.getenv("SUPABASE_URL"); SERVICE_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY"); GARMIN_EMAIL=os.getenv("GARMIN_EMAIL"); GARMIN_PASSWORD=os.getenv("GARMIN_PASSWORD"); USER_ID=os.getenv("USER_ID"); DAYS_BACK=int(os.getenv("DAYS_BACK","30"))
if not all([SUPABASE_URL,SERVICE_KEY,GARMIN_EMAIL,GARMIN_PASSWORD,USER_ID]): raise RuntimeError("Missing required environment variables. Copy .env.example to .env and complete it.")
db=create_client(SUPABASE_URL,SERVICE_KEY)
def number(value,kind=float):
    try: return None if value is None else kind(value)
    except (TypeError,ValueError): return None
def log(status,message):
    try: db.table("sync_logs").insert({"user_id":USER_ID,"source_system":"garmin","status":status,"message":str(message)[:2000]}).execute()
    except Exception: pass
def sync_daily(api,day):
    ds=day.isoformat()
    try: summary=api.get_user_summary(ds) or {}
    except Exception as exc: log("warning",f"Daily health failed for {ds}: {exc}"); return
    row={"user_id":USER_ID,"health_date":ds,"steps":number(summary.get("totalSteps"),int) or 0,"distance_m":number(summary.get("totalDistanceMeters")),"resting_heart_rate":number(summary.get("restingHeartRate"),int),"avg_heart_rate":number(summary.get("averageHeartRate"),int),"max_heart_rate":number(summary.get("maxHeartRate"),int),"stress_average":number(summary.get("averageStressLevel"),int),"active_calories":number(summary.get("activeKilocalories"),int),"total_calories":number(summary.get("totalKilocalories"),int),"intensity_minutes":(number(summary.get("moderateIntensityMinutes"),int) or 0)+(number(summary.get("vigorousIntensityMinutes"),int) or 0)}
    try:
        battery=api.get_body_battery(ds) or []; values=[]
        for item in battery if isinstance(battery,list) else []:
            value=item.get("bodyBatteryLevel")
            if value is None and isinstance(item.get("bodyBatteryValuesArray"),list):
                for point in item["bodyBatteryValuesArray"]:
                    if isinstance(point,list) and len(point)>1 and point[1] is not None: values.append(int(point[1]))
            elif value is not None: values.append(int(value))
        if values: row.update(body_battery_high=max(values),body_battery_low=min(values))
    except Exception: pass
    db.table("daily_health").upsert(row,on_conflict="user_id,health_date").execute()
def sync_sleep(api,day):
    ds=day.isoformat()
    try: sleep=api.get_sleep_data(ds) or {}
    except Exception as exc: log("warning",f"Sleep failed for {ds}: {exc}"); return
    daily=sleep.get("dailySleepDTO") or {}; scores=daily.get("sleepScores") or {}
    row={"user_id":USER_ID,"sleep_date":ds,"duration_minutes":number((daily.get("sleepTimeSeconds") or 0)/60,int),"deep_sleep_minutes":number((daily.get("deepSleepSeconds") or 0)/60,int),"light_sleep_minutes":number((daily.get("lightSleepSeconds") or 0)/60,int),"rem_sleep_minutes":number((daily.get("remSleepSeconds") or 0)/60,int),"awake_minutes":number((daily.get("awakeSleepSeconds") or 0)/60,int),"sleep_score":number((scores.get("overall") or {}).get("value"),int)}
    db.table("sleep_sessions").upsert(row,on_conflict="user_id,sleep_date").execute()
def sync_activities(api,start,end):
    try: activities=api.get_activities_by_date(start.isoformat(),end.isoformat()) or []
    except Exception as exc: log("warning",f"Activities failed: {exc}"); return
    for activity in activities:
        activity_id=str(activity.get("activityId") or "")
        if not activity_id: continue
        activity_type=activity.get("activityType") or {}
        row={"user_id":USER_ID,"garmin_activity_id":activity_id,"activity_type":activity_type.get("typeKey") if isinstance(activity_type,dict) else str(activity_type),"activity_name":activity.get("activityName"),"started_at":activity.get("startTimeGMT"),"duration_seconds":number(activity.get("duration"),int),"distance_m":number(activity.get("distance")),"calories":number(activity.get("calories"),int),"avg_heart_rate":number(activity.get("averageHR"),int),"max_heart_rate":number(activity.get("maxHR"),int),"raw_data":activity}
        db.table("activities").upsert(row,on_conflict="user_id,garmin_activity_id").execute()
def main():
    start=date.today()-timedelta(days=max(0,DAYS_BACK-1)); end=date.today(); print("Signing in to Garmin Connect..."); api=Garmin(GARMIN_EMAIL,GARMIN_PASSWORD); api.login(); print(f"Syncing {start} through {end}...")
    current=start
    while current<=end: print(f"  {current}"); sync_daily(api,current); sync_sleep(api,current); current+=timedelta(days=1)
    sync_activities(api,start,end); log("success",f"Garmin sync completed for {start} through {end}"); print("Garmin sync completed.")
if __name__=="__main__":
    try: main()
    except Exception as exc: log("error",exc); raise
