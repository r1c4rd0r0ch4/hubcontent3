/*
  # Fix reported_content_content_id_fkey to reference content_posts
  1. Drop the existing incorrect foreign key `reported_content_content_id_fkey` that references `content`.
  2. Add a new foreign key `reported_content_content_id_fkey` that correctly references `content_posts(id)`.
*/

-- Step 1: Drop the existing foreign key if it references the 'content' table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'reported_content_content_id_fkey'
        AND conrelid = 'public.reported_content'::regclass
        AND confrelid = 'public.content'::regclass -- Check if it references the old 'content' table
    ) THEN
        ALTER TABLE public.reported_content
        DROP CONSTRAINT reported_content_content_id_fkey;
        RAISE NOTICE 'Dropped incorrect foreign key "reported_content_content_id_fkey" referencing "content".';
    ELSE
        RAISE NOTICE 'Foreign key "reported_content_content_id_fkey" not found or already correct, skipping drop.';
    END IF;
END
$$;

-- Step 2: Add the correct foreign key referencing 'content_posts'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'reported_content_content_id_fkey'
        AND conrelid = 'public.reported_content'::regclass
        AND confrelid = 'public.content_posts'::regclass -- Check if it references 'content_posts'
    ) THEN
        ALTER TABLE public.reported_content
        ADD CONSTRAINT reported_content_content_id_fkey
        FOREIGN KEY (content_id) REFERENCES public.content_posts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added correct foreign key "reported_content_content_id_fkey" referencing "content_posts".';
    ELSE
        RAISE NOTICE 'Correct foreign key "reported_content_content_id_fkey" already exists, skipping add.';
    END IF;
END
$$;

-- Optional: Force PostgREST cache refresh by adding a comment to the table
-- This is a common workaround to ensure PostgREST picks up schema changes immediately.
COMMENT ON TABLE public.reported_content IS E'@rebuild_relationships';