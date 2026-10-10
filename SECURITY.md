# SECURITY v1.0.0
RLS: all tables ENABLE RLS auth.uid()=user_id, storage meal-photos foldername==auth.uid()
Upload: client 5MB mime whitelist magic bytes, server size 5MB decoded magic FF D8 FF / 89 50 4E 47 / RIFF WEBP MIME mismatch 400 enum note 300 sanitized clamps sanitizeError
Retention: Default NOT stored transient memory, Optional meal-photos/{user_id}/{uuid} private RLS retention_until 24h cleanup cron
Error: sanitizeError strips JWT token service_role
PWA: SW skips /rest/ /auth/ /functions/ and Authorization header
XSS: esc() encode, summary sanitize <>
Risks: CDN without SRI, no rate limiting, browser local timezone, AI mock
