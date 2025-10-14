/*
  # Fix Profile RLS Recursion and Add Missing Policies
  1. Drop existing admin RLS policies that cause recursion.
  2. Create a SECURITY DEFINER function `is_admin_user` to safely check admin status.
  3. Grant execution on `is_admin_user` to authenticated users.
  4. Re-create admin RLS policies using the new `is_admin_user` function.
  5. Add a crucial RLS policy allowing authenticated users to insert their own profile.
  6. Ensure basic RLS policies for users to read and update their own profile are present.
*/

-- 1. Drop existing admin RLS policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;

-- 2. Create a SECURITY DEFINER function `is_admin_user`
-- This function runs with the privileges of the function owner (e.g., supabase_admin)
-- and can safely query the profiles table to check is_admin without triggering RLS on profiles.
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND is_admin = TRUE);
END;
$$;

-- 3. Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

-- 4. Re-create admin RLS policies using the new `is_admin_user` function

-- Policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Policy for admins to insert new profiles
CREATE POLICY "Admins can insert profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- Policy for admins to update any profile
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Policy for admins to delete any profile
CREATE POLICY "Admins can delete all profiles" ON profiles
FOR DELETE TO authenticated
USING (public.is_admin_user(auth.uid()));

-- 5. Add a crucial RLS policy allowing authenticated users to insert their own profile
-- This policy is essential for any user (common or influencer) to create their initial profile entry.
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles; -- Drop if it somehow existed
CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- 6. Ensure basic RLS policies for users to read and update their own profile are present.
-- These policies should already exist, but we ensure they are here for completeness and correctness.

-- Policy for users to read their own data
DROP POLICY IF EXISTS "Users read own data" ON profiles;
CREATE POLICY "Users read own data" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Policy for users to update their own data
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON profiles;
CREATE POLICY "Allow authenticated users to update their own profile"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
