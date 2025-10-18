/*
  # Create or replace get_influencer_subscriber_count RPC function
  1. Function: get_influencer_subscriber_count (p_influencer_id uuid) returns bigint
  2. Security: Set to SECURITY DEFINER to bypass RLS for counting.
  3. Grants: Grant EXECUTE to authenticated users.
*/
CREATE OR REPLACE FUNCTION get_influencer_subscriber_count(p_influencer_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial para ignorar RLS na tabela de assinaturas para a contagem
AS $$
DECLARE
    subscriber_count bigint;
BEGIN
    SELECT COUNT(id)
    INTO subscriber_count
    FROM public.subscriptions
    WHERE influencer_id = p_influencer_id AND status = 'active';

    RETURN subscriber_count;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_influencer_subscriber_count(uuid) TO authenticated;