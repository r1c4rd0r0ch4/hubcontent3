/*
  # Add RLS policy for kyc_documents INSERT
  1. Security: Allow authenticated users to insert their own KYC documents into the 'kyc_documents' table.
*/
CREATE POLICY "Influencers can insert their own KYC documents"
ON kyc_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
