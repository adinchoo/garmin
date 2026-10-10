// date-utils-v46.js - Patch 006 Dashboard Timezone and Date Consistency
// Establishes consistent date handling: calendar dates vs instants
// Calendar date: YYYY-MM-DD (health_date, sleep_date) - represents user's local date, no timezone
// Instant: ISO timestamp (started_at, meal_time, measured_at, created_at) - UTC instant, display in local tz
(() => {
"use strict";

function isValidCalendarDate(s){
  if(typeof s!=="string") return false;
  // YYYY-MM-DD
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d]=s.split("-").map(Number);
  if(m<1||m>12||d<1||d>31) return false;
  const dt=new Date(y, m-1, d);
  return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d;
}

function parseCalendarDateLocal(s){
  // Parses YYYY-MM-DD as local date at midnight, without UTC shift
  // Returns Date or null
  if(!isValidCalendarDate(s)) return null;
  const [y,m,d]=s.split("-").map(Number);
  // Local midnight
  return new Date(y, m-1, d);
}

function parseInstant(s){
  // Parses ISO instant string to Date, returns null if invalid
  if(!s) return null;
  const d=new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toCalendarDateStringLocal(d){
  // Date -> YYYY-MM-DD in local timezone
  if(!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function toCalendarDateStringUTC(d){
  // Date -> YYYY-MM-DD in UTC
  if(!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const y=d.getUTCFullYear();
  const m=String(d.getUTCMonth()+1).padStart(2,"0");
  const day=String(d.getUTCDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function toLocalDateKeyFromInstant(instantStr){
  // Instant string -> local YYYY-MM-DD
  const d=parseInstant(instantStr);
  if(!d) return null;
  return toCalendarDateStringLocal(d);
}

function toUTCDateKeyFromInstant(instantStr){
  const d=parseInstant(instantStr);
  if(!d) return null;
  return toCalendarDateStringUTC(d);
}

function startOfLocalDay(d){
  const copy=new Date(d);
  copy.setHours(0,0,0,0);
  return copy;
}

function endOfLocalDay(d){
  const copy=new Date(d);
  copy.setHours(23,59,59,999);
  return copy;
}

function getLocalDayBoundsForCalendarDate(calendarDateStr){
  // Given YYYY-MM-DD (user's calendar date), return local start/end Date objects
  const localMidnight=parseCalendarDateLocal(calendarDateStr);
  if(!localMidnight) return null;
  return { start: startOfLocalDay(localMidnight), end: endOfLocalDay(localMidnight) };
}

function getTodayLocalBounds(){
  const now=new Date();
  return { start: startOfLocalDay(now), end: endOfLocalDay(now), todayKey: toCalendarDateStringLocal(now) };
}

function isSameLocalDay(a,b){
  const da=parseInstant(a) || parseCalendarDateLocal(a);
  const db=parseInstant(b) || parseCalendarDateLocal(b);
  if(!da||!db) return false;
  return toCalendarDateStringLocal(da)===toCalendarDateStringLocal(db);
}

function formatLocalDateTime(instantStr, opts){
  const d=parseInstant(instantStr);
  if(!d) return "—";
  try{
    return d.toLocaleString([], opts||{ day:"numeric", month:"short", hour:"numeric", minute:"2-digit" });
  }catch{ return d.toISOString(); }
}

function localDateTimeInputValue(dateObj){
  // For <input type=datetime-local> value - local time without timezone
  // Equivalent to old localDateTime() but using utils
  const d=dateObj instanceof Date ? dateObj : new Date();
  // Get YYYY-MM-DDTHH:mm in local time
  const pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function safeParseForDisplay(value){
  // Tries calendar date first, then instant
  if(isValidCalendarDate(value)) return parseCalendarDateLocal(value);
  return parseInstant(value);
}

// Deterministic helper for tests: allows injecting now
let _nowOverride=null;
function now(){ return _nowOverride ? new Date(_nowOverride) : new Date(); }
function setNowOverride(iso){ _nowOverride=iso; }
function clearNowOverride(){ _nowOverride=null; }

window.DateUtils={
  isValidCalendarDate,
  parseCalendarDateLocal,
  parseInstant,
  toCalendarDateStringLocal,
  toCalendarDateStringUTC,
  toLocalDateKeyFromInstant,
  toUTCDateKeyFromInstant,
  startOfLocalDay,
  endOfLocalDay,
  getLocalDayBoundsForCalendarDate,
  getTodayLocalBounds,
  isSameLocalDay,
  formatLocalDateTime,
  localDateTimeInputValue,
  safeParseForDisplay,
  setNowOverride,
  clearNowOverride,
  now
};
})();
