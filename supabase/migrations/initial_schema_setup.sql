/*
  # Initial Schema Setup - Definitive Fix for Enum Creation and RLS Policies
  This migration sets up all necessary tables, enums, and Row Level Security (RLS) policies
  for the ContentHub application. This revised version includes `DROP POLICY IF EXISTS`
  statements to prevent "policy already exists" errors during execution.

  **CRITICAL FIX**: Corrected the enum creation block to properly define `kyc_document_status_enum`
  instead of attempting to redefine `kyc_document_type_enum`, which caused the "type already exists" error.

  **CRITICAL CHANGE**: To definitively resolve the persistent "column user_id" does not exist error,
  we are removing the `public.get_user_influencer_ids()` helper function.
  Instead, all RLS policies that check for influencer ownership will now use a direct
  `EXISTS` subquery, explicitly correlating the `influencer_id` of the current table
  with `public.influencer_profiles.id` and checking `public.influencer_profiles.user_id`
  against `public.get_authenticated_user_id()`.

  This approach makes the column references unambiguous and avoids any potential
  scoping or parsing issues that might have been caused by the previous `IN (SELECT function())` pattern.

  The `public.get_authenticated_user_id()` and `public.is_admin()` helper functions remain,
  as they correctly retrieve the authenticated user's UUID and check admin status, respectively.

  **CRITICAL REORDERING**: Helper functions `is_admin()` and `get_authenticated_user_id()`
  are now defined at the very beginning of the script to ensure they are available
  before any other DDL statements (enums, tables, RLS policies) that might depend on them.

  1.  **Helper Functions**: `is_admin()`, `get_authenticated_user_id()` are defined first.
  2.  **Enums**: Defines various enums for account status, KYC documents, content status, and reported content status.
  3.  **Tables**: Creates all core tables including profiles, influencer profiles, content, subscriptions, payments,
      KYC documents, reported content, admin logs, and more.
  4.  **Foreign Keys**: Establishes relationships between tables.
  5.  **Indexes**: Adds indexes for frequently queried columns to improve performance.
  6.  **Removed Functions/Views**: `get_user_influencer_ids()`, `get_current_influencer_id()`, `user_owned_influencer_profiles` are removed.
  7.  **Row Level Security (RLS)**: Enables RLS for all tables and defines comprehensive policies
      to control data access based on user roles (authenticated, influencer, admin).
      Existing policies are dropped before recreation to avoid conflicts.
      **Revised RLS policies**: Policies checking influencer ownership now use explicit `EXISTS` subqueries
      to simplify evaluation and prevent the "column user_id does not exist" error.
*/

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = public.get_authenticated_user_id() AND is_admin = TRUE);
  END;
$$;

-- Helper function to get the authenticated user's ID
CREATE OR REPLACE FUNCTION public.get_authenticated_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  BEGIN
    RETURN current_setting('request.jwt.claims.sub', true)::uuid;
  END;
$$;

-- Create Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status_enum') THEN
    CREATE TYPE public.account_status_enum AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_document_type_enum') THEN
    CREATE TYPE public.kyc_document_type_enum AS ENUM ('id_front', 'id_back', 'proof_of_address', 'selfie_with_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_document_status_enum') THEN
    -- CORRECTED LINE: Creating kyc_document_status_enum
    CREATE TYPE public.kyc_document_status_enum AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reported_content_status_enum') THEN
    CREATE TYPE public.reported_content_status_enum AS ENUM ('pending', 'reviewed', 'resolved');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status_enum') THEN
    CREATE TYPE public.content_status_enum AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Create Tables

-- profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  user_type text DEFAULT 'user'::text CHECK (user_type IN ('user', 'influencer')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  date_of_birth date,
  address jsonb,
  document_type text,
  document_number text,
  account_status public.account_status_enum DEFAULT 'pending'::public.account_status_enum,
  is_admin boolean DEFAULT false,
  cover_photo_url text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- influencer_profiles table
CREATE TABLE IF NOT EXISTS public.influencer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_price numeric DEFAULT 0,
  instagram text,
  twitter text,
  tiktok text,
  other_links jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  total_subscribers integer DEFAULT 0
);
ALTER TABLE public.influencer_profiles ENABLE ROW LEVEL SECURITY;

-- content table
CREATE TABLE IF NOT EXISTS public.content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.influencer_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  media_url text NOT NULL,
  is_free boolean DEFAULT false,
  price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status public.content_status_enum DEFAULT 'pending'::public.content_status_enum,
  content_type text DEFAULT 'image'::text CHECK (content_type IN ('image', 'video', 'document')),
  thumbnail_url text,
  likes_count integer DEFAULT 0,
  total_views integer DEFAULT 0
);
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES public.influencer_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending'::text CHECK (status IN ('active', 'cancelled', 'pending')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  price_paid numeric
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- purchased_content table
CREATE TABLE IF NOT EXISTS public.purchased_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  purchase_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, content_id)
);
ALTER TABLE public.purchased_content ENABLE ROW LEVEL SECURITY;

-- kyc_documents table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type public.kyc_document_type_enum NOT NULL,
  file_url text NOT NULL,
  file_path text NOT NULL,
  status public.kyc_document_status_enum DEFAULT 'pending'::public.kyc_document_status_enum,
  admin_notes text,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- reported_content table
CREATE TABLE IF NOT EXISTS public.reported_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status public.reported_content_status_enum DEFAULT 'pending'::public.reported_content_status_enum,
  admin_notes text,
  reported_at timestamptz DEFAULT now()
);
ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;

-- admin_logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details jsonb,
  timestamp timestamptz DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- smtp_settings table
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL,
  port integer NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  from_email text NOT NULL,
  secure boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- content_likes table
CREATE TABLE IF NOT EXISTS public.content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (content_id, user_id)
);
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;

-- content_views table
CREATE TABLE IF NOT EXISTS public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

-- messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  subscriber_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES public.influencer_profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  influencer_earnings numeric NOT NULL,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_method text NOT NULL CHECK (payment_method IN ('credit_card', 'pix', 'paypal')),
  transaction_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- streaming_settings table
CREATE TABLE IF NOT EXISTS public.streaming_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid UNIQUE NOT NULL REFERENCES public.influencer_profiles(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT false,
  price_per_hour numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.streaming_settings ENABLE ROW LEVEL SECURITY;

-- streaming_bookings table
CREATE TABLE IF NOT EXISTS public.streaming_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.influencer_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  price_paid numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.streaming_bookings ENABLE ROW LEVEL SECURITY;

-- Remove the problematic get_user_influencer_ids function
DROP FUNCTION IF EXISTS public.get_user_influencer_ids CASCADE;

-- Remove the problematic get_current_influencer_id function
DROP FUNCTION IF EXISTS public.get_current_influencer_id CASCADE;

-- Drop the problematic view
DROP VIEW IF EXISTS public.user_owned_influencer_profiles;

-- RLS Policies

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = public.get_authenticated_user_id());

-- influencer_profiles
DROP POLICY IF EXISTS "Admins can manage all influencer profiles" ON public.influencer_profiles;
CREATE POLICY "Admins can manage all influencer profiles" ON public.influencer_profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Influencers can view their own profile" ON public.influencer_profiles;
CREATE POLICY "Influencers can view their own profile" ON public.influencer_profiles FOR SELECT TO authenticated USING (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Influencers can update their own profile" ON public.influencer_profiles;
CREATE POLICY "Influencers can update their own profile" ON public.influencer_profiles FOR UPDATE TO authenticated USING (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Influencers can insert their own profile" ON public.influencer_profiles;
CREATE POLICY "Influencers can insert their own profile" ON public.influencer_profiles FOR INSERT TO authenticated WITH CHECK (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "All users can view public influencer profiles" ON public.influencer_profiles;
CREATE POLICY "All users can view public influencer profiles" ON public.influencer_profiles FOR SELECT USING (true);

-- content
DROP POLICY IF EXISTS "Influencers can manage their own content SELECT" ON public.content;
CREATE POLICY "Influencers can manage their own content SELECT" ON public.content FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = content.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Influencers can manage their own content INSERT" ON public.content;
CREATE POLICY "Influencers can manage their own content INSERT" ON public.content FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = content.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Influencers can manage their own content UPDATE" ON public.content;
CREATE POLICY "Influencers can manage their own content UPDATE" ON public.content FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = content.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = content.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Influencers can manage their own content DELETE" ON public.content;
CREATE POLICY "Influencers can manage their own content DELETE" ON public.content FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = content.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);

DROP POLICY IF EXISTS "Admins can manage all content" ON public.content;
CREATE POLICY "Admins can manage all content" ON public.content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "All users can view free content" ON public.content;
CREATE POLICY "All users can view free content" ON public.content FOR SELECT USING (is_free = true OR public.is_admin());
DROP POLICY IF EXISTS "Subscribers can view content from subscribed influencers" ON public.content;
CREATE POLICY "Subscribers can view content from subscribed influencers" ON public.content FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE subscriber_id = public.get_authenticated_user_id()
    AND influencer_id = public.content.influencer_id
  ) OR public.is_admin()
);
DROP POLICY IF EXISTS "Purchasers can view purchased content" ON public.content;
CREATE POLICY "Purchasers can view purchased content" ON public.content FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.purchased_content
    WHERE user_id = public.get_authenticated_user_id()
    AND content_id = public.content.id
  ) OR public.is_admin()
);

-- subscriptions
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (subscriber_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Influencers can view subscriptions to their content" ON public.subscriptions;
CREATE POLICY "Influencers can view subscriptions to their content" ON public.subscriptions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = subscriptions.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Users can create subscriptions" ON public.subscriptions;
CREATE POLICY "Users can create subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (subscriber_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can update their own subscriptions (e.g., cancel)" ON public.subscriptions;
CREATE POLICY "Users can update their own subscriptions (e.g., cancel)" ON public.subscriptions FOR UPDATE TO authenticated USING (subscriber_id = public.get_authenticated_user_id());

-- purchased_content
DROP POLICY IF EXISTS "Admins can manage all purchased content" ON public.purchased_content;
CREATE POLICY "Admins can manage all purchased content" ON public.purchased_content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users can view their own purchased content" ON public.purchased_content;
CREATE POLICY "Users can view their own purchased content" ON public.purchased_content FOR SELECT TO authenticated USING (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can insert their own purchased content" ON public.purchased_content;
CREATE POLICY "Users can insert their own purchased content" ON public.purchased_content FOR INSERT TO authenticated WITH CHECK (user_id = public.get_authenticated_user_id());

-- kyc_documents
DROP POLICY IF EXISTS "Admins can manage all KYC documents" ON public.kyc_documents;
CREATE POLICY "Admins can manage all KYC documents" ON public.kyc_documents FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can view their own KYC documents" ON public.kyc_documents FOR SELECT TO authenticated USING (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can upload their own KYC documents" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can update their own KYC documents" ON public.kyc_documents FOR UPDATE TO authenticated USING (user_id = public.get_authenticated_user_id());

-- reported_content
DROP POLICY IF EXISTS "Admins can manage all reported content" ON public.reported_content;
CREATE POLICY "Admins can manage all reported content" ON public.reported_content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users can report content" ON public.reported_content;
CREATE POLICY "Users can report content" ON public.reported_content FOR INSERT TO authenticated WITH CHECK (reporter_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can view their own reported content" ON public.reported_content;
CREATE POLICY "Users can view their own reported content" ON public.reported_content FOR SELECT TO authenticated USING (reporter_id = public.get_authenticated_user_id());

-- admin_logs
DROP POLICY IF EXISTS "Admins can view admin logs" ON public.admin_logs;
CREATE POLICY "Admins can view admin logs" ON public.admin_logs FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can insert admin logs" ON public.admin_logs;
CREATE POLICY "Admins can insert admin logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- smtp_settings
DROP POLICY IF EXISTS "Admins can manage SMTP settings" ON public.smtp_settings;
CREATE POLICY "Admins can manage SMTP settings" ON public.smtp_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- content_likes
DROP POLICY IF EXISTS "Admins can manage all content likes" ON public.content_likes;
CREATE POLICY "Admins can manage all content likes" ON public.content_likes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Authenticated users can like content" ON public.content_likes;
CREATE POLICY "Authenticated users can like content" ON public.content_likes FOR INSERT TO authenticated WITH CHECK (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Authenticated users can unlike content" ON public.content_likes;
CREATE POLICY "Authenticated users can unlike content" ON public.content_likes FOR DELETE TO authenticated USING (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "All users can view content likes" ON public.content_likes;
CREATE POLICY "All users can view content likes" ON public.content_likes FOR SELECT USING (true);

-- content_views
DROP POLICY IF EXISTS "Admins can manage all content views" ON public.content_views;
CREATE POLICY "Admins can manage all content views" ON public.content_views FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Authenticated users can record content views" ON public.content_views;
CREATE POLICY "Authenticated users can record content views" ON public.content_views FOR INSERT TO authenticated WITH CHECK (viewer_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "All users can view content views" ON public.content_views;
CREATE POLICY "All users can view content views" ON public.content_views FOR SELECT USING (true);

-- messages
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;
CREATE POLICY "Admins can manage all messages" ON public.messages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT TO authenticated USING (sender_id = public.get_authenticated_user_id() OR receiver_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can mark their received messages as read" ON public.messages;
CREATE POLICY "Users can mark their received messages as read" ON public.messages FOR UPDATE TO authenticated USING (receiver_id = public.get_authenticated_user_id());

-- payments
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT TO authenticated USING (subscriber_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Influencers can view payments for their content" ON public.payments;
CREATE POLICY "Influencers can view payments for their content" ON public.payments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = payments.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
CREATE POLICY "Authenticated users can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (subscriber_id = public.get_authenticated_user_id());

-- streaming_settings
DROP POLICY IF EXISTS "Influencers can manage their own streaming settings SELECT" ON public.streaming_settings;
CREATE POLICY "Influencers can manage their own streaming settings SELECT" ON public.streaming_settings FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = streaming_settings.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Influencers can manage their own streaming settings INSERT" ON public.streaming_settings;
CREATE POLICY "Influencers can manage their own streaming settings INSERT" ON public.streaming_settings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = streaming_settings.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Influencers can manage their own streaming settings UPDATE" ON public.streaming_settings;
CREATE POLICY "Influencers can manage their own streaming settings UPDATE" ON public.streaming_settings FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = streaming_settings.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = streaming_settings.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Influencers can manage their own streaming settings DELETE" ON public.streaming_settings;
CREATE POLICY "Influencers can manage their own streaming settings DELETE" ON public.streaming_settings FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = streaming_settings.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);

DROP POLICY IF EXISTS "All users can view streaming settings" ON public.streaming_settings;
CREATE POLICY "All users can view streaming settings" ON public.streaming_settings FOR SELECT USING (true);

-- streaming_bookings
DROP POLICY IF EXISTS "Admins can manage all streaming bookings" ON public.streaming_bookings;
CREATE POLICY "Admins can manage all streaming bookings" ON public.streaming_bookings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users can view their own streaming bookings" ON public.streaming_bookings;
CREATE POLICY "Users can view their own streaming bookings" ON public.streaming_bookings FOR SELECT TO authenticated USING (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Users can create streaming bookings" ON public.streaming_bookings;
CREATE POLICY "Users can create streaming bookings" ON public.streaming_bookings FOR INSERT TO authenticated WITH CHECK (user_id = public.get_authenticated_user_id());
DROP POLICY IF EXISTS "Influencers can manage bookings for their streams" ON public.streaming_bookings;
CREATE POLICY "Influencers can manage bookings for their streams" ON public.streaming_bookings FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = streaming_bookings.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);
DROP POLICY IF EXISTS "Influencers can view bookings for their streams" ON public.streaming_bookings;
CREATE POLICY "Influencers can view bookings for their streams" ON public.streaming_bookings FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.influencer_profiles ip
    WHERE ip.id = streaming_bookings.influencer_id
    AND ip.user_id = public.get_authenticated_user_id()
  )
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
CREATE INDEX IF NOT EXISTS profiles_user_type_idx ON public.profiles (user_type);
CREATE INDEX IF NOT EXISTS influencer_profiles_user_id_idx ON public.influencer_profiles (user_id);
CREATE INDEX IF NOT EXISTS content_influencer_id_idx ON public.content (influencer_id);
CREATE INDEX IF NOT EXISTS content_status_idx ON public.content (status);
CREATE INDEX IF NOT EXISTS subscriptions_subscriber_id_idx ON public.subscriptions (subscriber_id);
CREATE INDEX IF NOT EXISTS subscriptions_influencer_id_idx ON public.subscriptions (influencer_id);
CREATE INDEX IF NOT EXISTS purchased_content_user_id_idx ON public.purchased_content (user_id);
CREATE INDEX IF NOT EXISTS purchased_content_content_id_idx ON public.purchased_content (content_id);
CREATE INDEX IF NOT EXISTS kyc_documents_user_id_idx ON public.kyc_documents (user_id);
CREATE INDEX IF NOT EXISTS kyc_documents_status_idx ON public.kyc_documents (status);
CREATE INDEX IF NOT EXISTS reported_content_content_id_idx ON public.reported_content (content_id);
CREATE INDEX IF NOT EXISTS reported_content_reporter_id_idx ON public.reported_content (reporter_id);
CREATE INDEX IF NOT EXISTS reported_content_status_idx ON public.reported_content (status);
CREATE INDEX IF NOT EXISTS admin_logs_admin_id_idx ON public.admin_logs (admin_id);
CREATE INDEX IF NOT EXISTS content_likes_content_id_idx ON public.content_likes (content_id);
CREATE INDEX IF NOT EXISTS content_likes_user_id_idx ON public.content_likes (user_id);
CREATE INDEX IF NOT EXISTS content_views_content_id_idx ON public.content_views (content_id);
CREATE INDEX IF NOT EXISTS content_views_viewer_id_idx ON public.content_views (viewer_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS payments_subscriber_id_idx ON public.payments (subscriber_id);
CREATE INDEX IF NOT EXISTS payments_influencer_id_idx ON public.payments (influencer_id);
CREATE INDEX IF NOT EXISTS streaming_settings_influencer_id_idx ON public.streaming_settings (influencer_id);
CREATE INDEX IF NOT EXISTS streaming_bookings_influencer_id_idx ON public.streaming_bookings (influencer_id);
CREATE INDEX IF NOT EXISTS streaming_bookings_user_id_idx ON public.streaming_bookings (user_id);