/*
  # Create user_purchased_content table
  1. New Tables: user_purchased_content (id uuid, user_id uuid, content_id uuid, purchase_date timestamptz, price_paid numeric)
  2. Security: Enable RLS, add policies for authenticated users to manage their own purchases.
*/
CREATE TABLE IF NOT EXISTS user_purchased_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  purchase_date timestamptz DEFAULT now(),
  price_paid numeric NOT NULL,
  UNIQUE (user_id, content_id) -- A user can only purchase a specific content once
);

ALTER TABLE user_purchased_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchased content" ON user_purchased_content
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchased content" ON user_purchased_content
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Optional: Prevent users from updating/deleting purchase records
CREATE POLICY "Admins can update/delete purchased content" ON user_purchased_content
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));