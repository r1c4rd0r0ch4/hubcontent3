/*
  # Admin KYC Document Management Policies
  1. Ensure RLS is enabled for the kyc_documents table.
  2. Add RLS policies for admin users to SELECT all kyc_documents.
  3. These policies allow any authenticated user whose own profile marks them as an admin
     to perform these actions on *any* kyc_document.
*/

-- Ensure RLS is enabled for the kyc_documents table
ALTER TABLE IF EXISTS kyc_documents ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all kyc_documents
-- This policy allows an authenticated user who is an admin to SELECT any row from the kyc_documents table.
DROP POLICY IF EXISTS "Admins can view all kyc documents" ON kyc_documents;
CREATE POLICY "Admins can view all kyc documents" ON kyc_documents
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Note: No INSERT, UPDATE, DELETE policies are explicitly added here for admins on kyc_documents
-- as the current flow only requires viewing and then updating the status via the application logic
-- (which uses the service role key in the Edge Function or direct Supabase client calls with RLS bypassed for admin actions).
