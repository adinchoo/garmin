// Shared validation helpers for Edge Functions
export const ALLOWED_MIME = ["image/jpeg","image/png","image/webp"] as const;
export const MAX_BYTES = 5*1024*1024;
export function detectMime(bytes: Uint8Array): string|null {
  if(bytes[0]===0xFF && bytes[1]===0xD8 && bytes[2]===0xFF) return "image/jpeg";
  if(bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4E && bytes[3]===0x47) return "image/png";
  if(bytes[0]===0x52 && bytes[1]===0x49 && bytes[2]===0x46 && bytes[3]===0x46 && bytes[8]===0x57) return "image/webp";
  return null;
}
