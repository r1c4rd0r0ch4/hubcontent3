/*
  # Add foreign key constraint to reported_content and enable RLS
  1. Add FK: reported_content.content_id -> content_posts.id with ON DELETE CASCADE
  2. Enable RLS on reported_content
  3. Add RLS policies for reported_content:
     - SELECT: Authenticated users (own reports) and Admins (all reports)
     - INSERT: Authenticated users
     - UPDATE: Admins
     - DELETE: Admins
*/
ALTER TABLE reported_content
ADD CONSTRAINT reported_content_content_id_fkey
FOREIGN KEY (content_id) REFERENCES content_posts(id) ON DELETE CASCADE;

ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their own reports
CREATE POLICY "Authenticated users can view their own reported content"
ON reported_content FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

-- Policy for admins to view all reported content
CREATE POLICY "Admins can view all reported content"
ON reported_content FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Policy for authenticated users to insert new reports
CREATE POLICY "Authenticated users can insert reported content"
ON reported_content FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Policy for admins to update reported content (e.g., status, admin_notes)
CREATE POLICY "Admins can update reported content"
ON reported_content FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Policy for admins to delete reported content
CREATE POLICY "Admins can delete reported content"
ON reported_content FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));