/*
  # Add RLS policies for smtp_settings table
  1. Security: Enable RLS on smtp_settings.
  2. Policies: Allow SELECT, INSERT, UPDATE for authenticated users who are administrators.
*/
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated administrators to manage (select, insert, update) SMTP settings
CREATE POLICY "Admins can manage smtp settings"
ON smtp_settings FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));