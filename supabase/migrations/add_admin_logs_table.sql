/*
  # Create admin_logs table
  1. New Tables: admin_logs (id uuid, admin_id uuid, action text, target_user_id uuid, details jsonb, created_at timestamp)
  2. Security: Enable RLS, add policy for admins to select all logs.
*/
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (admins) to select all admin logs
CREATE POLICY "Admins can view all admin logs"
ON admin_logs FOR SELECT TO authenticated
USING (true);

-- Policy for authenticated users (admins) to insert admin logs
CREATE POLICY "Admins can insert admin logs"
ON admin_logs FOR INSERT TO authenticated
WITH CHECK (true); -- Admins can log any action
