/*
  # Re-establish content_likes foreign key to content_posts
  1. Drop existing fk_content_id constraint if it exists.
  2. Add fk_content_id constraint to content_likes referencing content_posts.
  This migration aims to force Supabase's schema cache to recognize the relationship.
  Also adds comments to potentially force schema refresh.
*/

-- Drop the existing foreign key constraint if it exists
ALTER TABLE content_likes
DROP CONSTRAINT IF EXISTS fk_content_id;

-- Add the foreign key constraint referencing content_posts
ALTER TABLE content_likes
ADD CONSTRAINT fk_content_id
FOREIGN KEY (content_id)
REFERENCES public.content_posts(id)
ON DELETE CASCADE;

-- Add comments to the table and column to potentially force a schema refresh
COMMENT ON TABLE public.content_likes IS 'Table for user likes on content posts. Re-added FK to force schema refresh.';
COMMENT ON COLUMN public.content_likes.content_id IS 'Foreign key to the content_posts table. Re-added FK to force schema refresh.';