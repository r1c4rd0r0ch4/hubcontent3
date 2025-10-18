/*
  # Create user_purchased_content table
  1. New Tables: user_purchased_content (id uuid, user_id uuid, content_id uuid, price_paid numeric, created_at timestamptz)
  2. Security: Enable RLS, add policies for insert, select, update, delete by content owner.
  3. Constraints: Add unique constraint on (user_id, content_id).
*/
CREATE TABLE IF NOT EXISTS user_purchased_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  price_paid numeric NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_content
    FOREIGN KEY (content_id)
    REFERENCES public.content_posts(id)
    ON DELETE CASCADE,

  CONSTRAINT unique_user_content UNIQUE (user_id, content_id)
);

ALTER TABLE user_purchased_content ENABLE ROW LEVEL SECURITY;

-- Policy for users to insert their own purchased content
CREATE POLICY "Users can insert their own purchased content."
ON user_purchased_content FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for users to select their own purchased content
CREATE POLICY "Users can view their own purchased content."
ON user_purchased_content FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Policy for users to update their own purchased content (e.g., status, if applicable)
CREATE POLICY "Users can update their own purchased content."
ON user_purchased_content FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own purchased content (if allowed, e.g., refund)
CREATE POLICY "Users can delete their own purchased content."
ON user_purchased_content FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_purchased_content_user_id ON user_purchased_content (user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchased_content_content_id ON user_purchased_content (content_id);