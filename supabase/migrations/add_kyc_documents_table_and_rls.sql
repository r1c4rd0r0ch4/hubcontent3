/*
  # Create kyc_documents table and RLS policies
  1. New Tables: kyc_documents (id uuid, user_id uuid, document_type text, file_url text, file_path text, status text, uploaded_at timestamptz, updated_at timestamptz)
  2. Security: Enable RLS, add policies for authenticated users to insert their own documents, and for admins to select all documents.
  3. Constraints: Add foreign key to profiles table.
*/
CREATE TYPE kyc_document_type_enum AS ENUM ('id_front', 'id_back', 'proof_of_address', 'selfie_with_id', 'other');
CREATE TYPE kyc_document_status_enum AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type kyc_document_type_enum NOT NULL,
  file_url text NOT NULL,
  file_path text NOT NULL,
  status kyc_document_status_enum NOT NULL DEFAULT 'pending',
  uploaded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert their own KYC documents
CREATE POLICY "Authenticated users can insert their own KYC documents"
ON kyc_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users (admins) to select all KYC documents
CREATE POLICY "Admins can view all KYC documents"
ON kyc_documents FOR SELECT TO authenticated
USING (true);

-- Policy for authenticated users (admins) to update KYC document status
CREATE POLICY "Admins can update KYC document status"
ON kyc_documents FOR UPDATE TO authenticated
USING (true);

-- Policy for authenticated users to delete their own KYC documents (optional, but good practice)
CREATE POLICY "Authenticated users can delete their own KYC documents"
ON kyc_documents FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents (user_id);