/*
  # Add status column to content_posts
  1. Alter Tables: content_posts (add status text column)
  2. Security: Update RLS policies if necessary (not explicitly needed for this change, but good practice to review).
*/
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_posts' AND column_name = 'status') THEN
        ALTER TABLE content_posts ADD COLUMN status text DEFAULT 'active' NOT NULL;
        -- Add a check constraint for valid statuses
        ALTER TABLE content_posts ADD CONSTRAINT chk_content_posts_status CHECK (status IN ('active', 'pending_review', 'rejected'));
    END IF;
END
$$;

-- Update existing content to 'active' if status is null (for backward compatibility)
UPDATE content_posts SET status = 'active' WHERE status IS NULL;

-- If you have existing RLS policies on content_posts, you might need to review them.
-- For example, if content should only be visible if status is 'active'.
-- Example (adjust as per your existing policies):
-- CREATE POLICY "Content posts are viewable by everyone" ON content_posts
-- FOR SELECT USING (status = 'active');