
-- Add cover_image_url and version to system_announcements
ALTER TABLE public.system_announcements
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS version text;

-- Create storage bucket for announcement covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-covers', 'announcement-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view announcement covers (public bucket)
CREATE POLICY "Announcement covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-covers');

-- Only super admins can upload announcement covers
CREATE POLICY "Super admins can upload announcement covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'announcement-covers' AND public.is_super_admin(auth.uid()));

-- Super admins can update announcement covers
CREATE POLICY "Super admins can update announcement covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'announcement-covers' AND public.is_super_admin(auth.uid()));

-- Super admins can delete announcement covers
CREATE POLICY "Super admins can delete announcement covers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'announcement-covers' AND public.is_super_admin(auth.uid()));
