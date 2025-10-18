/*
  # Create avatars storage bucket and RLS policies
  1. New Bucket: avatars
  2. Security: Enable RLS for storage.objects, add policies for upload, view, and delete by content owner for the avatars bucket.
*/

-- Ensure RLS is enabled for storage.objects (already done in previous migration, but good to be explicit)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') THEN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE) -- Avatars should be public
ON CONFLICT (id) DO NOTHING;

-- Policy for avatars: Allow authenticated users to upload their own avatar
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for avatars: Allow anyone to view avatars
CREATE POLICY "avatars_select_all"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy for avatars: Allow authenticated users to update their own avatar
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for avatars: Allow authenticated users to delete their own avatar
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);