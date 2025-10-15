/*
  # Ensure kyc_documents.status is NOT NULL with default
  1. Schema Changes: Alter kyc_documents table to set status to NOT NULL with a default of 'pending'.
*/
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_documents' AND column_name='status' AND is_nullable='YES') THEN
        ALTER TABLE kyc_documents ALTER COLUMN status SET DEFAULT 'pending';
        UPDATE kyc_documents SET status = 'pending' WHERE status IS NULL;
        ALTER TABLE kyc_documents ALTER COLUMN status SET NOT NULL;
    END IF;
END
$$;