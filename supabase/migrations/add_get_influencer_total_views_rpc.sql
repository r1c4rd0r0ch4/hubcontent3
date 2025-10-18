/*
  # Create RPC function get_influencer_total_views
  1. New Function: get_influencer_total_views (p_influencer_id uuid) returns bigint
  2. Description: Calculates the total views across all approved content posts for a given influencer.
*/
CREATE OR REPLACE FUNCTION get_influencer_total_views(p_influencer_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_views_count bigint;
BEGIN
  SELECT
    COALESCE(SUM(cv.count), 0)
  INTO
    total_views_count
  FROM
    content_posts cp
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) as count
    FROM
      content_views
    WHERE
      content_id = cp.id
  ) cv ON true
  WHERE
    cp.user_id = p_influencer_id AND cp.status = 'approved';

  RETURN total_views_count;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_influencer_total_views(uuid) TO authenticated;