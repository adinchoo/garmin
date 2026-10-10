
const fs=require('fs'),path=require('path');
const css=["app.css","ios-fullscreen.css","ios-redesign.css","ios-next.css","ios-edge-v19.css","production-iphone-v1.css","pwa-fullscreen-navigation-fix.css","responsive-hotfix-v40.css","responsive-clean-v41.css"];
let fail=0;
for(const c of css){ if(!fs.existsSync(path.join('assets/css',c))){console.error('MISSING '+c);fail++;} }
const js=["config.js","core.js","date-utils-v46.js","auth-guard-v42.js","app.js","activity-fix-v44.js"];
for(const j of js){ if(!fs.existsSync(path.join('assets/js',j))){console.error('MISSING '+j);fail++;} }
if(fail>0)process.exit(1);
console.log('PASS asset integrity');
