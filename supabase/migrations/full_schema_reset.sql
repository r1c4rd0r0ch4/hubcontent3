/*
  # Full Schema Reset (DANGER: DELETES ALL DATA)
  This migration is designed to completely reset the public schema of your Supabase database.
  It will drop all tables, functions, enums, and RLS policies in the public schema.
  
  **WARNING: EXECUTING THIS SCRIPT WILL PERMANENTLY DELETE ALL DATA IN YOUR PUBLIC SCHEMA.**
  Only run this if you intend to start with a completely fresh database.

  Steps:
  1. Drop all RLS policies.
  2. Drop all views.
  3. Drop all tables (using CASCADE to handle foreign key dependencies).
  4. Drop all functions.
  5. Drop all enums.
*/

-- Drop all RLS policies
DO $$ DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename || ';';
    END LOOP;
END $$;

-- Drop all views
DROP VIEW IF EXISTS public.user_owned_influencer_profiles CASCADE;

-- Drop all tables with CASCADE to handle foreign key dependencies
-- Listing in reverse dependency order is generally safer, but CASCADE handles most cases.
DROP TABLE IF EXISTS public.streaming_bookings CASCADE;
DROP TABLE IF EXISTS public.streaming_settings CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.content_views CASCADE;
DROP TABLE IF EXISTS public.content_likes CASCADE;
DROP TABLE IF EXISTS public.smtp_settings CASCADE;
DROP TABLE IF EXISTS public.admin_logs CASCADE;
DROP TABLE IF EXISTS public.reported_content CASCADE;
DROP TABLE IF EXISTS public.kyc_documents CASCADE;
DROP TABLE IF EXISTS public.purchased_content CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.content CASCADE;
DROP TABLE IF EXISTS public.influencer_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_authenticated_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_influencer_ids() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_influencer_id() CASCADE;

-- Drop all enums
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status_enum') THEN
    DROP TYPE public.account_status_enum;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_document_type_enum') THEN
    DROP TYPE public.kyc_document_type_enum;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_document_status_enum') THEN
    DROP TYPE public.kyc_document_status_enum;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reported_content_status_enum') THEN
    DROP TYPE public.reported_content_status_enum;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status_enum') THEN
    DROP TYPE public.content_status_enum;
  END IF;
END $$;
