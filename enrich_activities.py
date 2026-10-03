v1import io
import json
import math
import os
import time
import zipfile
from datetime import datetime, timezone
from datetime import date
from typing import Any
from dotenv import load_dotenv
from fitparse import FitFile
from garminconnect import Garmin
from supabase import create_client

load_dotenv()
SUPABASE_URL=os.environ["SUPABASE_URL"]
SERVICE_KEY=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GARMIN_EMAIL=os.environ["GARMIN_EMAIL"]
GARMIN_PASSWORD=os.environ["GARMIN_PASSWORD"]
USER_ID=os.environ["USER_ID"]
TOKEN_STORE=os.getenv("GARMIN_TOKEN_STORE","./garmin_tokens")
LIMIT=int(os.getenv("STREAM_SYNC_LIMIT","10"))
MAX_POINTS=int(os.getenv("STREAM_MAX_POINTS","1200"))
SLEEP=float(os.getenv("STREAM_DELAY_SECONDS","2"))
UPLOAD_FIT=os.getenv("UPLOAD_FIT_FILES","1")=="1"
BUCKET=os.getenv("ACTIVITY_FILES_BUCKET","activity-files")
db=create_client(SUPABASE_URL,SERVICE_KEY)

def login():
    api=Garmin(GARMIN_EMAIL,GARMIN_PASSWORD)
    if os.path.exists(TOKEN_STORE):
        api.garth.load(TOKEN_STORE)
        profile=getattr(api.garth,"profile",None) or {}
        api.display_name=profile.get("displayName") or profile.get("userName")
        if not api.display_name:
            p=api.garth.connectapi("/userprofile-service/socialProfile")
            api.display_name=p.get("displayName") or p.get("userName")
        api.get_user_summary(date.today().isoformat())
        return api
    api.login()
    os.makedirs(TOKEN_STORE,exist_ok=True)
    api.garth.dump(TOKEN_STORE)
    return api

def raw_fit(data: bytes) -> bytes:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            names=[n for n in z.namelist() if n.lower().endswith(".fit")]
            if not names: raise ValueError("Original download contains no FIT file")
            return z.read(names[0])
    except zipfile.BadZipFile:
        return data

def semicircle(value):
    if value is None:return None
    return float(value)*180.0/(2**31)

def number(value):
    if value is None:return None
    try:return round(float(value),4)
    except (TypeError,ValueError):return None

def thin(rows, maximum):
    if maximum < 1:
        raise ValueError("STREAM_MAX_POINTS must be at least 1")
    if len(rows)<=maximum:return rows
    if maximum == 1:return [rows[0]]
    step=(len(rows)-1)/(maximum-1)
    indexes=sorted(set(round(i*step) for i in range(maximum)))
    return [rows[i] for i in indexes]

def parse_fit(content: bytes):
    fit=FitFile(io.BytesIO(content),check_crc=False)
    points=[]
    laps=[]
    first_ts=None
    for message in fit.get_messages("record"):
        v=message.get_values()
        ts=v.get("timestamp")
        if ts and first_ts is None:first_ts=ts
        elapsed=(ts-first_ts).total_seconds() if ts and first_ts else len(points)
        speed=v.get("enhanced_speed",v.get("speed"))
        points.append({
            "t":round(float(elapsed),1),"lat":semicircle(v.get("position_lat")),"lng":semicircle(v.get("position_long")),
            "d":number(v.get("distance")),"a":number(v.get("enhanced_altitude",v.get("altitude"))),
            "hr":number(v.get("heart_rate")),"c":number(v.get("cadence")),"s":number(speed),
            "p":number(v.get("power")),"temp":number(v.get("temperature"))
        })
    for message in fit.get_messages("lap"):
        v=message.get_values()
        laps.append({k:(value.isoformat() if hasattr(value,"isoformat") else value) for k,value in v.items() if k in {
            "start_time","total_elapsed_time","total_timer_time","total_distance","total_calories","avg_speed","max_speed","avg_heart_rate","max_heart_rate","avg_cadence","avg_power","total_ascent","total_descent"}})
    points=thin(points,MAX_POINTS)
    series=lambda key:[[p["t"],p[key]] for p in points if p.get(key) is not None]
    route=[[p["lat"],p["lng"]] for p in points if p.get("lat") is not None and p.get("lng") is not None]
    vals=lambda key:[p[key] for p in points if p.get(key) is not None]
    altitude=vals("a"); hr=vals("hr"); cadence=vals("c"); power=vals("p")
    gain=sum(max(0,altitude[i]-altitude[i-1]) for i in range(1,len(altitude))) if altitude else 0
    avg=lambda xs:round(sum(xs)/len(xs),1) if xs else None
    duration=int(points[-1]["t"]) if points else 0
    return {
      "sample_count":len(points),"duration_seconds":duration,"distance_m":max(vals("d"),default=0),"route":route,
      "timestamps":[p["t"] for p in points],"distance_series":series("d"),"altitude_series":series("a"),
      "heart_rate_series":series("hr"),"cadence_series":series("c"),"speed_series":series("s"),
      "power_series":series("p"),"temperature_series":series("temp"),"laps":laps,
      "summary":{"elevation_gain_m":round(gain,1),"avg_heart_rate":avg(hr),"max_heart_rate":max(hr,default=None),
                 "avg_cadence":avg(cadence),"avg_power":avg(power),"max_power":max(power,default=None),"has_route":bool(route)}
    }

def upload_fit(activity_id, content):
    path=f"{USER_ID}/{activity_id}.fit"
    db.storage.from_(BUCKET).upload(path=path,file=content,file_options={"content-type":"application/octet-stream","upsert":"true"})
    return path

def pending():
    q=(db.table("activities").select("id,garmin_activity_id").eq("user_id",USER_ID)
       .neq("stream_status","ready").order("started_at",desc=True).limit(LIMIT).execute())
    return q.data or []

def sync_one(api,row):
    aid=str(row["garmin_activity_id"])
    db.table("activities").update({"stream_status":"processing"}).eq("id",row["id"]).execute()
    try:
        downloaded=api.download_activity(aid,dl_fmt=api.ActivityDownloadFormat.ORIGINAL)
        content=raw_fit(downloaded)
        parsed=parse_fit(content)
        stream={"activity_id":row["id"],"user_id":USER_ID,**parsed}
        db.table("activity_streams").upsert(stream,on_conflict="activity_id").execute()
        path=upload_fit(aid,content) if UPLOAD_FIT else None
        summary=parsed["summary"]
        db.table("activities").update({"stream_status":"ready","stream_synced_at":datetime.now(timezone.utc).isoformat(),
          "fit_storage_path":path,"elevation_gain_m":summary.get("elevation_gain_m"),
          "avg_cadence":summary.get("avg_cadence"),"avg_power":summary.get("avg_power")}).eq("id",row["id"]).execute()
        print(f"Ready: {aid}, {parsed['sample_count']} samples")
    except Exception as exc:
        db.table("activities").update({"stream_status":"error"}).eq("id",row["id"]).execute()
        print(f"Failed {aid}: {exc}")

def main():
    api=login(); rows=pending(); print(f"Activities to enrich: {len(rows)}")
    for row in rows:
        sync_one(api,row); time.sleep(SLEEP)
if __name__=="__main__":main()
