/*
  # Create reported_content table
  1. New Tables: reported_content (id uuid, content_id uuid, reporter_id uuid, reason text, details text, status text, admin_notes text, reported_at timestamptz, resolved_at timestamptz)
  2. Security: Enable RLS, add policies for authenticated users to insert reports.
  3. Indexes: Add index on content_id and status for efficient querying.
*/
CREATE TABLE IF NOT EXISTS reported_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' NOT NULL, -- 'pending', 'reviewed', 'resolved'
  admin_notes text,
  reported_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz,
  CONSTRAINT chk_reported_content_status CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can report content' AND tablename = 'reported_content') THEN
    CREATE POLICY "Authenticated users can report content" ON reported_content
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
  END IF;
END $$;

-- Allow admins to view all reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all reported content' AND tablename = 'reported_content') THEN
    CREATE POLICY "Admins can view all reported content" ON reported_content
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
  END IF;
END $$;

-- Allow admins to update reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update reported content' AND tablename = 'reported_content') THEN
    CREATE POLICY "Admins can update reported content" ON reported_content
    FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reported_content_content_id ON reported_content (content_id);
CREATE INDEX IF NOT EXISTS idx_reported_content_status ON reported_content (status);