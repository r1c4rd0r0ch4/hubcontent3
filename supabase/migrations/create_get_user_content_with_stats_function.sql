/*
  # Create get_user_content_with_stats function
  1. New Function: get_user_content_with_stats (p_user_id uuid)
  2. Description: Returns content posts for a given user, including aggregated likes and views counts.
*/
CREATE OR REPLACE FUNCTION get_user_content_with_stats(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    description text,
    file_path text,
    file_url text,
    is_free boolean,
    is_purchasable boolean,
    price numeric,
    status text,
    thumbnail_url text,
    title text,
    type text,
    updated_at timestamptz,
    user_id uuid,
    likes_count bigint,
    views_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.id,
        cp.created_at,
        cp.description,
        cp.file_path,
        cp.file_url,
        cp.is_free,
        cp.is_purchasable,
        cp.price,
        cp.status,
        cp.thumbnail_url,
        cp.title,
        cp.type,
        cp.updated_at,
        cp.user_id,
        COALESCE(lc.count, 0) AS likes_count,
        COALESCE(vc.count, 0) AS views_count
    FROM
        content_posts cp
    LEFT JOIN (
        SELECT content_id, COUNT(*) AS count
        FROM content_likes
        GROUP BY content_id
    ) lc ON cp.id = lc.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) AS count
        FROM content_views
        GROUP BY content_id
    ) vc ON cp.id = vc.content_id
    WHERE
        cp.user_id = p_user_id
        AND cp.status = 'approved'; -- Only approved content
END;
$$;