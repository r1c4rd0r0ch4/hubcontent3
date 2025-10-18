/*
  # Update RLS for Public Influencer Access
  1. Security: Update RLS policies for `profiles` to allow authenticated users to view approved influencer profiles.
  2. Security: Update RLS policies for `influencer_profiles` to allow authenticated users to view profiles linked to approved influencers.
  3. Security: Ensure `subscriptions` and `user_purchased_content` RLS allow authenticated users to insert and select their own data.
*/

-- Enable RLS for all relevant tables if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchased_content ENABLE ROW LEVEL SECURITY;

-- RLS for 'profiles' table
-- Drop existing policies that might conflict or be too restrictive
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON profiles;
DROP POLICY IF EXISTS "Influencers can manage their own profile" ON profiles;

-- Policy 1: Influencers can manage their own profile
CREATE POLICY "Influencers can manage their own profile" ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 2: Authenticated users can view approved influencer profiles
CREATE POLICY "Authenticated users can view approved influencer profiles" ON profiles
FOR SELECT
TO authenticated
USING (is_influencer = true AND account_status = 'approved');

-- Policy 3: Authenticated users can view their own profile (for non-influencers)
CREATE POLICY "Authenticated users can view their own profile" ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- RLS for 'influencer_profiles' table
-- Drop existing policies that might conflict or be too restrictive
DROP POLICY IF EXISTS "Influencer profiles are viewable by everyone." ON influencer_profiles;
DROP POLICY IF EXISTS "Influencers can manage their own influencer profile" ON influencer_profiles;

-- Policy 1: Influencers can manage their own influencer profile
CREATE POLICY "Influencers can manage their own influencer profile" ON influencer_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Authenticated users can view influencer profiles if the associated profile is approved
CREATE POLICY "Authenticated users can view approved influencer_profiles" ON influencer_profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = influencer_profiles.user_id
          AND profiles.is_influencer = true
          AND profiles.account_status = 'approved'
    )
);

-- RLS for 'subscriptions' table
-- Drop existing policies that might conflict or be too restrictive
DROP POLICY IF EXISTS "Subscribers can manage their own subscriptions." ON subscriptions;
DROP POLICY IF EXISTS "Influencers can view subscriptions to their content." ON subscriptions;

-- Policy 1: Subscribers can manage their own subscriptions
CREATE POLICY "Subscribers can manage their own subscriptions" ON subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = subscriber_id)
WITH CHECK (auth.uid() = subscriber_id);

-- Policy 2: Influencers can view subscriptions to their content
CREATE POLICY "Influencers can view subscriptions to their content" ON subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = influencer_id);

-- RLS for 'user_purchased_content' table
-- Drop existing policies that might conflict or be too restrictive
DROP POLICY IF EXISTS "Users can manage their own purchased content." ON user_purchased_content;
DROP POLICY IF EXISTS "Influencers can view purchases of their content." ON user_purchased_content;

-- Policy 1: Users can manage their own purchased content
CREATE POLICY "Users can manage their own purchased content" ON user_purchased_content
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Influencers can view purchases of their content
CREATE POLICY "Influencers can view purchases of their content" ON user_purchased_content
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM content_posts
        WHERE content_posts.id = user_purchased_content.content_id
          AND content_posts.user_id = auth.uid()
    )
);