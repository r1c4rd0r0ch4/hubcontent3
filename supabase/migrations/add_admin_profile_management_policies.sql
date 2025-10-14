/*
  # Admin Profile Management Policies
  1. Ensure RLS is enabled for the profiles table.
  2. Add RLS policies for admin users to SELECT, INSERT, UPDATE, DELETE all profiles.
  3. These policies allow any authenticated user whose own profile marks them as an admin
     to perform these actions on *any* profile.
*/

-- Ensure RLS is enabled for the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all profiles
-- This policy allows an authenticated user who is an admin to SELECT any row from the profiles table.
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Policy for admins to insert new profiles
-- This policy allows an authenticated user who is an admin to INSERT new rows into the profiles table.
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Policy for admins to update any profile
-- This policy allows an authenticated user who is an admin to UPDATE any row in the profiles table.
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Policy for admins to delete any profile
-- This policy allows an authenticated user who is an admin to DELETE any row from the profiles table.
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;
CREATE POLICY "Admins can delete all profiles" ON profiles
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Note: Existing policies like "Users read own data" and "Users update own data"
-- should still be in place to allow regular users to manage their own profiles.
-- These admin policies are additive and grant broader permissions to specific users.
