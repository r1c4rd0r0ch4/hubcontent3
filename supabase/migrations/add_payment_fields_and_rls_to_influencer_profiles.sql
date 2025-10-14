/*
  # Add payment fields and RLS policies to influencer_profiles table
  1. New Columns: payment_email (text), payment_pix (text) to influencer_profiles.
  2. Security: Ensure RLS is enabled, add policies for SELECT, INSERT, UPDATE for authenticated users on their own influencer profile.
*/

-- Add payment_email column if it doesn't exist
ALTER TABLE IF EXISTS public.influencer_profiles
ADD COLUMN IF NOT EXISTS payment_email text DEFAULT '' NOT NULL;

-- Add payment_pix column if it doesn't exist
ALTER TABLE IF EXISTS public.influencer_profiles
ADD COLUMN IF NOT EXISTS payment_pix text DEFAULT '' NOT NULL;

-- Enable Row Level Security for influencer_profiles if not already enabled
ALTER TABLE public.influencer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if they were partially defined
DROP POLICY IF EXISTS "Influencers can view their own profile" ON public.influencer_profiles;
DROP POLICY IF EXISTS "Influencers can insert their own profile" ON public.influencer_profiles;
DROP POLICY IF EXISTS "Influencers can update their own profile" ON public.influencer_profiles;

-- Policy for influencers to view their own data
CREATE POLICY "Influencers can view their own profile" ON public.influencer_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Policy for influencers to insert their own data (during signup)
CREATE POLICY "Influencers can insert their own profile" ON public.influencer_profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for influencers to update their own data
CREATE POLICY "Influencers can update their own profile" ON public.influencer_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);