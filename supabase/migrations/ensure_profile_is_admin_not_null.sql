/*
  # Ensure profiles.is_admin is NOT NULL with default
  1. Schema Changes: Alter profiles table to set is_admin to NOT NULL with a default of FALSE.
*/
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin' AND is_nullable='YES') THEN
        ALTER TABLE profiles ALTER COLUMN is_admin SET DEFAULT FALSE;
        UPDATE profiles SET is_admin = FALSE WHERE is_admin IS NULL;
        ALTER TABLE profiles ALTER COLUMN is_admin SET NOT NULL;
    END IF;
END
$$;