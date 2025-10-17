/*
  # Create content_posts table
  1. New Tables: content_posts (id uuid, user_id uuid, title text, description text, type text, file_url text, file_path text, thumbnail_url text, created_at timestamptz, updated_at timestamptz)
  2. Security: Enable RLS, add policies for authenticated users to manage their own content.
  3. Indexes: Add index on user_id for efficient querying.
*/
CREATE TABLE IF NOT EXISTS content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL, -- e.g., 'video', 'image', 'audio'
  file_url text NOT NULL,
  file_path text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view their own content' AND tablename = 'content_posts') THEN
    CREATE POLICY "Authenticated users can view their own content" ON content_posts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow authenticated users to insert their own content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert their own content' AND tablename = 'content_posts') THEN
    CREATE POLICY "Authenticated users can insert their own content" ON content_posts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow authenticated users to update their own content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update their own content' AND tablename = 'content_posts') THEN
    CREATE POLICY "Authenticated users can update their own content" ON content_posts
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow authenticated users to delete their own content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete their own content' AND tablename = 'content_posts') THEN
    CREATE POLICY "Authenticated users can delete their own content" ON content_posts
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create index for performance on user_id
CREATE INDEX IF NOT EXISTS idx_content_posts_user_id ON content_posts (user_id);