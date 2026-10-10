
// nutrition_security.test.js
const fs=require('fs');
const nutrition=fs.readFileSync('assets/js/nutrition.js','utf8');
const app=fs.readFileSync('assets/js/app.js','utf8');
if(!nutrition.includes('arrayBuffer') && !nutrition.includes('magic')){ console.error('FAIL no magic bytes client'); process.exit(1); }
if(!nutrition.includes('clearPhoto') || !nutrition.includes('revokeObjectURL')){ console.error('FAIL no clearPhoto'); process.exit(1); }
if(!app.includes('storage.from') || !app.includes('meal-photos')){ console.error('FAIL no storage cleanup'); process.exit(1); }
console.log('PASS nutrition security client checks');
