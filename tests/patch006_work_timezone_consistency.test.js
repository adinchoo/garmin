
const fs=require('fs');
let DateUtils={};
eval(fs.readFileSync('assets/js/date-utils-v46.js','utf8').replace('window.DateUtils','DateUtils'));

function assert(cond,msg){ if(!cond){ console.error('FAIL '+msg); process.exit(1);} console.log('PASS '+msg); }

// Near midnight UTC vs local
const utcMidnight = '2024-05-13T23:30:00Z';
const utcKey = DateUtils.toUTCDateKeyFromInstant(utcMidnight);
const localKey = DateUtils.toLocalDateKeyFromInstant(utcMidnight);
assert(utcKey==='2024-05-13', 'UTC key is 2024-05-13');
assert(localKey!==null && localKey.match(/\d{4}-\d{2}-\d{2}/), 'local key exists');
console.log(`UTC slice would give 2024-05-13, local gives ${localKey} - documents fix for +08:00 etc.`);

const calendar = '2024-05-13';
const parsedLocal = DateUtils.parseCalendarDateLocal(calendar);
assert(parsedLocal instanceof Date && parsedLocal.getDate()===13, 'calendar parsed as local day 13');

const mealInstant = new Date();
const todayBounds = DateUtils.getTodayLocalBounds();
const mealKey = DateUtils.toCalendarDateStringLocal(mealInstant);
assert(mealKey===todayBounds.todayKey, 'meal today grouped as today');

console.log('All timezone consistency tests PASS');
