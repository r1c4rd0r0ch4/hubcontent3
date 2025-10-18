/*
  # Create kyc-documents storage bucket and RLS policies
  1. New Bucket: kyc-documents
  2. Security: Enable RLS for storage.objects, add policies for upload, view, and delete by content owner for the kyc-documents bucket.
*/

-- Ensure RLS is enabled for storage.objects (already done in previous migration, but good to be explicit)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') THEN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Create kyc-documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', FALSE) -- KYC documents should NOT be public
ON CONFLICT (id) DO NOTHING;

-- Policy for kyc-documents: Allow authenticated users to upload their own KYC documents
CREATE POLICY "kyc_documents_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for kyc-documents: Allow authenticated users to view their own KYC documents
CREATE POLICY "kyc_documents_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for kyc-documents: Allow authenticated users to delete their own KYC documents
CREATE POLICY "kyc_documents_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Optional: Policy for admins to view all KYC documents (if an 'admin' role exists)
-- CREATE POLICY "kyc_documents_select_admin"
-- ON storage.objects FOR SELECT TO service_role -- Or a custom 'admin' role
-- USING (bucket_id = 'kyc-documents');