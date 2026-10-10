-- Patch 005 - Meal Photos Storage Hardening
-- Creates private bucket meal-photos with RLS and 24h retention policy documentation
-- If you choose to store images, use this bucket. Default policy is NO storage (transient only).

-- Create bucket if not exists (via storage API, but SQL for policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meal-photos', 'meal-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET file_size_limit=5242880, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'], public=false;

-- Enable RLS on storage.objects (already enabled, but ensure)
-- Policies for meal-photos bucket: only owner can read/write/delete own folder

DROP POLICY IF EXISTS "Users can upload own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own meal photos" ON storage.objects;

CREATE POLICY "Users can upload own meal photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own meal photos" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own meal photos" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add image_path column to meals if not exists (nullable, for optional storage)
ALTER TABLE meals ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS image_retention_until timestamptz;

-- Comment: Retention policy - if image_path is set, it should be deleted after 24h via cron job or Edge Function cleanup
COMMENT ON COLUMN meals.image_path IS 'Optional private storage path in meal-photos bucket. NULL means transient analysis per Patch 005 policy.';
COMMENT ON COLUMN meals.image_retention_until IS 'If image_path set, delete after this timestamp. Default 24h. See SECURITY_NOTES.md';
