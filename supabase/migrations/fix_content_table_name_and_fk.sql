/*
  # Resolve PGRST200 error by ensuring content_posts table name and FK
  1. Rename 'content' table to 'content_posts' if 'content' exists (based on PostgREST hint).
  2. Add FK: reported_content.content_id -> content_posts.id with ON DELETE CASCADE (if not already present).
  3. Ensure RLS is enabled and policies are set for reported_content.
*/

-- Step 1: Rename 'content' table to 'content_posts' if it exists.
-- This addresses the PostgREST hint "Perhaps you meant 'content' instead of 'content_posts'."
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content') THEN
        ALTER TABLE public.content RENAME TO content_posts;
        RAISE NOTICE 'Table "content" renamed to "content_posts".';
    ELSE
        RAISE NOTICE 'Table "content" does not exist, skipping rename.';
    END IF;
END
$$;

-- Step 2: Add foreign key constraint to reported_content referencing content_posts
-- Use a PL/pgSQL block to safely add the FK only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'reported_content_content_id_fkey'
        AND conrelid = 'public.reported_content'::regclass
    ) THEN
        ALTER TABLE reported_content
        ADD CONSTRAINT reported_content_content_id_fkey
        FOREIGN KEY (content_id) REFERENCES content_posts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key "reported_content_content_id_fkey" added.';
    ELSE
        RAISE NOTICE 'Foreign key "reported_content_content_id_fkey" already exists, skipping.';
    END IF;
END
$$;

-- Step 3: Ensure RLS is enabled and policies are set for reported_content
ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;

-- Policies (using IF NOT EXISTS for safety)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can view their own reported content') THEN
        CREATE POLICY "Authenticated users can view their own reported content"
        ON reported_content FOR SELECT TO authenticated
        USING (reporter_id = auth.uid());
        RAISE NOTICE 'RLS policy "Authenticated users can view their own reported content" created.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all reported content') THEN
        CREATE POLICY "Admins can view all reported content"
        ON reported_content FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
        RAISE NOTICE 'RLS policy "Admins can view all reported content" created.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can insert reported content') THEN
        CREATE POLICY "Authenticated users can insert reported content"
        ON reported_content FOR INSERT TO authenticated
        WITH CHECK (reporter_id = auth.uid());
        RAISE NOTICE 'RLS policy "Authenticated users can insert reported content" created.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can update reported content') THEN
        CREATE POLICY "Admins can update reported content"
        ON reported_content FOR UPDATE TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
        RAISE NOTICE 'RLS policy "Admins can update reported content" created.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can delete reported content') THEN
        CREATE POLICY "Admins can delete reported content"
        ON reported_content FOR DELETE TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
        RAISE NOTICE 'RLS policy "Admins can delete reported content" created.';
    END IF;
END
$$;