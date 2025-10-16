/*
  # Create content table
  1. New Tables: content (id uuid, influencer_id uuid, title text, description text, content_type text, file_url text, thumbnail_url text, is_free boolean, is_purchasable boolean, price numeric, views_count integer, likes_count integer, status text, created_at timestamptz)
  2. Foreign Keys: influencer_id references influencer_profiles(id)
  3. Security: Enable RLS, add policies for influencers to manage their content and for authenticated users to view content.
*/
CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL CHECK (content_type IN ('image', 'video', 'document')),
  file_url text NOT NULL,
  thumbnail_url text,
  is_free boolean DEFAULT FALSE,
  is_purchasable boolean DEFAULT FALSE,
  price numeric DEFAULT 0 CHECK (price >= 0),
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Policy for influencers to manage their own content
CREATE POLICY "Influencers can manage their own content" ON content
FOR ALL TO authenticated
USING (
  (SELECT user_id FROM influencer_profiles WHERE id = influencer_id) = auth.uid()
) WITH CHECK (
  (SELECT user_id FROM influencer_profiles WHERE id = influencer_id) = auth.uid()
);

-- Policy for authenticated users to view free content or content they have purchased (future)
CREATE POLICY "Authenticated users can view free content" ON content
FOR SELECT TO authenticated
USING (is_free = TRUE);

-- Policy for anonymous users to view free content
CREATE POLICY "Anonymous users can view free content" ON content
FOR SELECT TO anon
USING (is_free = TRUE);

-- Add index for faster lookups by influencer_id
CREATE INDEX IF NOT EXISTS idx_content_influencer_id ON content (influencer_id);