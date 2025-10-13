/*
  # Create reported_content table and RLS policies
  This migration ensures the 'reported_content' table and its associated enum and RLS policies are correctly created.
  This is a fix-up migration to address the issue where the table was not found in the database.

  1.  **Enum**: Defines 'reported_content_status_enum' if it doesn't exist.
  2.  **Table**: Creates 'reported_content' table if it doesn't exist, with foreign keys to 'content' and 'profiles'.
  3.  **RLS**: Enables Row Level Security and defines policies for admins and authenticated users.
*/

-- Create reported_content_status_enum if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reported_content_status_enum') THEN
    CREATE TYPE public.reported_content_status_enum AS ENUM ('pending', 'reviewed', 'resolved');
  END IF;
END $$;

-- Create reported_content table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reported_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status public.reported_content_status_enum DEFAULT 'pending'::public.reported_content_status_enum,
  admin_notes text,
  reported_at timestamptz DEFAULT now()
);

-- Enable Row Level Security for reported_content
ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reported_content
-- Drop existing policies before creating to prevent errors if they partially exist
DROP POLICY IF EXISTS "Admins can manage all reported content" ON public.reported_content;
CREATE POLICY "Admins can manage all reported content" ON public.reported_content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can report content" ON public.reported_content;
CREATE POLICY "Users can report content" ON public.reported_content FOR INSERT TO authenticated WITH CHECK (reporter_id = public.get_authenticated_user_id());

DROP POLICY IF EXISTS "Users can view their own reported content" ON public.reported_content;
CREATE POLICY "Users can view their own reported content" ON public.reported_content FOR SELECT TO authenticated USING (reporter_id = public.get_authenticated_user_id());

-- Add index for performance
CREATE INDEX IF NOT EXISTS reported_content_content_id_idx ON public.reported_content (content_id);
CREATE INDEX IF NOT EXISTS reported_content_reporter_id_idx ON public.reported_content (reporter_id);
CREATE INDEX IF NOT EXISTS reported_content_status_idx ON public.reported_content (status);