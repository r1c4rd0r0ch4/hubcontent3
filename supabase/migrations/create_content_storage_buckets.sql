/*
  # Create content storage buckets and RLS policies
  1. New Buckets: content-images, content-videos, content-documents
  2. Security: Enable RLS for storage.objects, add policies for upload, view, and delete by content owner for each bucket.
*/

-- Enable RLS for storage.objects table if not already enabled
-- This is a global setting for the storage.objects table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') THEN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Create content-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-images', 'content-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy for content-images: Allow authenticated users to upload their own images
CREATE POLICY "content_images_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for content-images: Allow authenticated users to view all images
CREATE POLICY "content_images_select_all"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'content-images');

-- Policy for content-images: Allow content owner to delete their images
CREATE POLICY "content_images_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-images' AND auth.uid()::text = (storage.foldername(name))[1]);


-- Create content-videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-videos', 'content-videos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy for content-videos: Allow authenticated users to upload their own videos
CREATE POLICY "content_videos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for content-videos: Allow authenticated users to view all videos
CREATE POLICY "content_videos_select_all"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'content-videos');

-- Policy for content-videos: Allow content owner to delete their videos
CREATE POLICY "content_videos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-videos' AND auth.uid()::text = (storage.foldername(name))[1]);


-- Create content-documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-documents', 'content-documents', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy for content-documents: Allow authenticated users to upload their own documents
CREATE POLICY "content_documents_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for content-documents: Allow authenticated users to view all documents
CREATE POLICY "content_documents_select_all"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'content-documents');

-- Policy for content-documents: Allow content owner to delete their documents
CREATE POLICY "content_documents_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-documents' AND auth.uid()::text = (storage.foldername(name))[1]);