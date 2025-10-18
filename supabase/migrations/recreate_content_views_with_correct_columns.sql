/*
  # Recreate content_views table with correct column names and update record_content_view RPC
  1. Drop existing content_views table (if exists) and record_content_view function (if exists).
  2. Create content_views table with 'user_id' and 'created_at' columns.
  3. Add UNIQUE constraint on (content_id, user_id) to prevent duplicate views.
  4. Enable RLS and add policies.
  5. Add foreign keys to content_posts and profiles.
  6. Recreate the 'record_content_view' RPC function to align with the new table schema.
*/

-- Drop existing record_content_view function if it exists
DROP FUNCTION IF EXISTS public.record_content_view(uuid, uuid);

-- Drop existing content_views table if it exists
-- CASCADE will drop dependent objects like foreign keys and RLS policies
DROP TABLE IF EXISTS public.content_views CASCADE;

-- Create content_views table with correct column names
CREATE TABLE public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Add a unique constraint to prevent duplicate views from the same user on the same content
  CONSTRAINT unique_content_user_view UNIQUE (content_id, user_id),

  CONSTRAINT fk_content_views_user_id
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_content_views_content_id
    FOREIGN KEY (content_id)
    REFERENCES public.content_posts(id)
    ON DELETE CASCADE
);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert their own views
CREATE POLICY "Authenticated users can record their own content views."
ON public.content_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to select all views (for counting purposes)
CREATE POLICY "Authenticated users can view all content views."
ON public.content_views FOR SELECT TO authenticated
USING (TRUE);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_content_views_user_id ON public.content_views (user_id);
CREATE INDEX IF NOT EXISTS idx_content_views_content_id ON public.content_views (content_id);

-- Add comments to the table and column to potentially force a schema refresh
COMMENT ON TABLE public.content_views IS 'Table for tracking content views by users. Ensures FK to content_posts.';
COMMENT ON COLUMN public.content_views.content_id IS 'Foreign key to the content_posts table.';
COMMENT ON COLUMN public.content_views.user_id IS 'Foreign key to the profiles table (viewer).';

-- Recreate the record_content_view RPC function
CREATE OR REPLACE FUNCTION public.record_content_view(
    p_content_id uuid,
    p_viewer_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER -- Use SECURITY DEFINER to allow the function to bypass RLS for insertion
AS $$
DECLARE
    view_count bigint;
BEGIN
    -- Insert the view record, ignoring if a duplicate view from the same user on the same content already exists
    INSERT INTO public.content_views (content_id, user_id)
    VALUES (p_content_id, p_viewer_id)
    ON CONFLICT (content_id, user_id) DO NOTHING;

    -- Get the total view count for the content
    SELECT COUNT(*)
    INTO view_count
    FROM public.content_views
    WHERE content_id = p_content_id;

    RETURN view_count;
END;
$$;

-- Grant execution permissions to authenticated users and service_role
ALTER FUNCTION public.record_content_view(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.record_content_view(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_content_view(uuid, uuid) TO service_role;