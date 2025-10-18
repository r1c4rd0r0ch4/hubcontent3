/*
  # Add RLS policies for influencer discovery
  1. Profiles: Allow authenticated users to read all profiles.
  2. Influencer Profiles: Allow authenticated users to read all influencer profiles.
  3. Content Posts: Allow authenticated users to read approved content posts.
  4. Subscriptions: Allow authenticated users to read their own subscriptions.
  5. User Purchased Content: Allow authenticated users to read their own purchased content.
*/

-- Enable RLS for tables if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchased_content ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Allow authenticated users to read all profiles
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated"
ON profiles FOR SELECT TO authenticated
USING (true);

-- 2. Influencer Profiles: Allow authenticated users to read all influencer profiles
DROP POLICY IF EXISTS "influencer_profiles_select_all_authenticated" ON influencer_profiles;
CREATE POLICY "influencer_profiles_select_all_authenticated"
ON influencer_profiles FOR SELECT TO authenticated
USING (true);

-- 3. Content Posts: Allow authenticated users to read approved content posts
DROP POLICY IF EXISTS "content_posts_select_approved_authenticated" ON content_posts;
CREATE POLICY "content_posts_select_approved_authenticated"
ON content_posts FOR SELECT TO authenticated
USING (status = 'approved');

-- 4. Subscriptions: Allow authenticated users to read their own subscriptions
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own"
ON subscriptions FOR SELECT TO authenticated
USING (subscriber_id = auth.uid());

-- 5. User Purchased Content: Allow authenticated users to read their own purchased content
DROP POLICY IF EXISTS "user_purchased_content_select_own" ON user_purchased_content;
CREATE POLICY "user_purchased_content_select_own"
ON user_purchased_content FOR SELECT TO authenticated
USING (user_id = auth.uid());