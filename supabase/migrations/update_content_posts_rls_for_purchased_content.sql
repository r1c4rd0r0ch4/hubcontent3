/*
  # Update content_posts RLS for purchased content
  1. Security: Add RLS policies to content_posts to allow viewing purchased content.
*/
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Policy for influencers to manage their own content (if not already present)
DROP POLICY IF EXISTS "Influencers can manage their own content" ON content_posts;
CREATE POLICY "Influencers can manage their own content" ON content_posts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to view free content (if not already present)
DROP POLICY IF EXISTS "Authenticated users can view free content" ON content_posts;
CREATE POLICY "Authenticated users can view free content" ON content_posts
FOR SELECT
TO authenticated
USING (is_free = true);

-- Policy for authenticated users to view subscribed content (if not already present)
DROP POLICY IF EXISTS "Authenticated users can view subscribed content" ON content_posts;
CREATE POLICY "Authenticated users can view subscribed content" ON content_posts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE subscriptions.subscriber_id = auth.uid()
          AND subscriptions.influencer_id = content_posts.user_id
          AND subscriptions.status = 'active'
    )
);

-- NEW Policy for authenticated users to view purchased content
DROP POLICY IF EXISTS "Authenticated users can view purchased content" ON content_posts;
CREATE POLICY "Authenticated users can view purchased content" ON content_posts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_purchased_content
        WHERE user_purchased_content.user_id = auth.uid()
          AND user_purchased_content.content_id = content_posts.id
    )
);