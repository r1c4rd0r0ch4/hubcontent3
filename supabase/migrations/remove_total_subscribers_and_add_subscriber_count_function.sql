/*
  # Update influencer_profiles table and add subscriber count function
  1. Alter Table: influencer_profiles - Drop total_subscribers column if it exists.
  2. New Function: get_influencer_subscriber_count (influencer_id uuid) - Returns count of active subscribers.
*/

-- Drop total_subscribers column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='influencer_profiles' AND column_name='total_subscribers') THEN
        ALTER TABLE influencer_profiles DROP COLUMN total_subscribers;
    END IF;
END
$$;

-- Create a function to get the count of active subscribers for an influencer
CREATE OR REPLACE FUNCTION get_influencer_subscriber_count(p_influencer_id uuid)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    subscriber_count bigint;
BEGIN
    SELECT COUNT(*)
    INTO subscriber_count
    FROM subscriptions
    WHERE influencer_id = p_influencer_id AND status = 'active';

    RETURN subscriber_count;
END;
$$;