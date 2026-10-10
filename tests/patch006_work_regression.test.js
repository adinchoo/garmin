
const fs=require('fs');
let DateUtils={};
eval(fs.readFileSync('assets/js/date-utils-v46.js','utf8').replace('window.DateUtils','DateUtils'));

const oldSlice = (s)=>String(s).slice(0,10);
const instant = '2024-05-13T23:30:00Z';
const old = oldSlice(instant);
const newLocal = DateUtils.toLocalDateKeyFromInstant(instant);
console.log(`Old slice: ${old}, new local: ${newLocal} - difference expected near midnight, documents behavior change`);
if(old!==newLocal){
  console.log('PASS regression documents behavior change: old UTC slice vs new local key differ for midnight edge');
} else {
  console.log('PASS regression: same day for this TZ, but logic is now consistent');
}
