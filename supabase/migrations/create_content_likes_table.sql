/*
  # Create content_likes table
  1. New Tables: content_likes (id uuid, user_id uuid, content_id uuid, created_at timestamptz)
  2. Security: Enable RLS, add policies for insert, select, delete by authenticated users.
  3. Constraints: Add unique constraint on (user_id, content_id) to prevent duplicate likes.
*/
CREATE TABLE IF NOT EXISTS content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT fk_user_id
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_content_id
    FOREIGN KEY (content_id)
    REFERENCES public.content_posts(id)
    ON DELETE CASCADE,

  CONSTRAINT unique_user_content_like UNIQUE (user_id, content_id)
);

ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert their own likes
CREATE POLICY "Authenticated users can like content."
ON content_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to select all likes (for counting purposes)
CREATE POLICY "Authenticated users can view all content likes."
ON content_likes FOR SELECT TO authenticated
USING (TRUE);

-- Policy for authenticated users to delete their own likes
CREATE POLICY "Authenticated users can unlike their own content."
ON content_likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_content_likes_user_id ON content_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_content_likes_content_id ON content_likes (content_id);