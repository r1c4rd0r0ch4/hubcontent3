/*
  # Create content_views table and ensure foreign keys
  1. New Tables: content_views (id uuid, user_id uuid, content_id uuid, created_at timestamptz)
  2. Security: Enable RLS, add policies for insert, select by authenticated users.
  3. Constraints: Add foreign keys to content_posts and profiles.
*/
CREATE TABLE IF NOT EXISTS content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT fk_content_views_user_id
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_content_views_content_id
    FOREIGN KEY (content_id)
    REFERENCES public.content_posts(id)
    ON DELETE CASCADE
);

ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert their own views (handled by RPC, but good to have for direct inserts)
CREATE POLICY "Authenticated users can record their own content views."
ON content_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to select all views (for counting purposes)
CREATE POLICY "Authenticated users can view all content views."
ON content_views FOR SELECT TO authenticated
USING (TRUE);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_content_views_user_id ON content_views (user_id);
CREATE INDEX IF NOT EXISTS idx_content_views_content_id ON content_views (content_id);

-- Add comments to the table and column to potentially force a schema refresh
COMMENT ON TABLE public.content_views IS 'Table for tracking content views by users. Ensures FK to content_posts.';
COMMENT ON COLUMN public.content_views.content_id IS 'Foreign key to the content_posts table.';
COMMENT ON COLUMN public.content_views.user_id IS 'Foreign key to the profiles table (viewer).';