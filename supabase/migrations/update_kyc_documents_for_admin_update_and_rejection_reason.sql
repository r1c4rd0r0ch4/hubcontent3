/*
  # Add UPDATE RLS policy for kyc_documents for admins and add rejection_reason column
  1. Schema: Add rejection_reason column to kyc_documents table.
  2. Security: Add UPDATE policy for authenticated admins on kyc_documents table, allowing them to update status and rejection_reason.
*/

-- Add rejection_reason column to kyc_documents table
ALTER TABLE kyc_documents
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add RLS policy for admins to update kyc_documents status and rejection_reason
CREATE POLICY "Admins can update kyc document status"
ON kyc_documents FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
