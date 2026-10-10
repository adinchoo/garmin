
// retention.test.js
const fs=require('fs');
const edge=fs.readFileSync('supabase/functions/analyze-meal/index.ts','utf8');
if(edge.includes('image_base64') && edge.includes('console.log') && edge.match(/console\.log.*image_base64/)){ console.error('FAIL logs base64'); process.exit(1); }
if(!edge.includes('retention') || !edge.includes('Image not stored')){ console.error('FAIL retention field missing'); process.exit(1); }
if(edge.includes('signedUrl') && !edge.includes('no-store')){ console.warn('WARN signed URL check'); }
console.log('PASS retention policy checks');
