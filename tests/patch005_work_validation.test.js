
// validation.test.js - Patch 005
function detectMime(bytes){
  if(bytes[0]===0xFF && bytes[1]===0xD8 && bytes[2]===0xFF) return "image/jpeg";
  if(bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4E && bytes[3]===0x47) return "image/png";
  if(bytes[0]===0x52 && bytes[1]===0x49 && bytes[2]===0x46 && bytes[3]===0x46 && bytes[8]===0x57) return "image/webp";
  return null;
}
const tests=[
  {name:"JPEG", bytes:Uint8Array.from([0xFF,0xD8,0xFF,0x00]), expect:"image/jpeg"},
  {name:"PNG", bytes:Uint8Array.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]), expect:"image/png"},
  {name:"WebP", bytes:Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]), expect:"image/webp"},
  {name:"EXE", bytes:Uint8Array.from([0x4D,0x5A,0x90,0x00]), expect:null},
];
let pass=0;
for(const t of tests){
  const got=detectMime(t.bytes);
  if(got===t.expect){ console.log(`PASS ${t.name}`); pass++; } else { console.error(`FAIL ${t.name} got ${got} expect ${t.expect}`); process.exit(1); }
}
console.log(`All ${pass}/${tests.length} magic bytes tests PASS`);
