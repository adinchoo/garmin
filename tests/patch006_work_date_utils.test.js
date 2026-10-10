
const { execSync } = require('child_process');
// Simulate DateUtils in Node
// Load date-utils file content and evaluate
const fs=require('fs');
const code=fs.readFileSync('assets/js/date-utils-v46.js','utf8');
// Replace window.DateUtils with global for Node test
let DateUtils={};
eval(code.replace('window.DateUtils','DateUtils'));

function assert(cond,msg){ if(!cond){ console.error('FAIL '+msg); process.exit(1);} console.log('PASS '+msg); }

assert(DateUtils.isValidCalendarDate('2024-05-13'), 'valid calendar date');
assert(!DateUtils.isValidCalendarDate('2024-02-30'), 'invalid Feb 30');
assert(!DateUtils.isValidCalendarDate('2024-13-01'), 'invalid month');
assert(DateUtils.parseCalendarDateLocal('2024-05-13') instanceof Date, 'parse calendar local');
assert(DateUtils.parseInstant('2024-05-13T23:30:00Z') instanceof Date, 'parse instant');
assert(DateUtils.parseInstant('invalid')===null, 'parse invalid returns null');
assert(DateUtils.toCalendarDateStringLocal(new Date(2024,4,13)).match(/\d{4}-\d{2}-\d{2}/), 'to local string format');
assert(DateUtils.toLocalDateKeyFromInstant('2024-05-13T23:30:00Z').match(/\d{4}-\d{2}-\d{2}/), 'to local key format');
assert(DateUtils.toUTCDateKeyFromInstant('2024-05-13T23:30:00Z')==='2024-05-13', 'UTC key');
assert(DateUtils.startOfLocalDay(new Date()).getHours()===0, 'start of day 00:00');
assert(DateUtils.endOfLocalDay(new Date()).getHours()===23, 'end of day 23');
assert(DateUtils.localDateTimeInputValue(new Date(2024,4,13,9,30)).match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), 'local datetime input format');
assert(DateUtils.toLocalDateKeyFromInstant('2024-02-29T12:00:00Z')!==null, 'leap year handling');
assert(DateUtils.getTodayLocalBounds().todayKey.match(/\d{4}-\d{2}-\d{2}/), 'today bounds');
console.log('All date_utils tests PASS');
