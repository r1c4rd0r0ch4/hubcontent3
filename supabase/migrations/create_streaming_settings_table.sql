/*
  # Create streaming_settings table
  1. New Tables: streaming_settings (influencer_id uuid, is_enabled boolean, price_5min numeric, price_10min numeric, price_15min numeric, price_30min numeric, min_notice_hours numeric, max_bookings_per_day integer, updated_at timestamptz)
  2. Foreign Keys: influencer_id references influencer_profiles(id)
  3. Security: Enable RLS, add policies for influencers to manage their settings and for authenticated users to view settings.
*/
CREATE TABLE IF NOT EXISTS streaming_settings (
  influencer_id uuid PRIMARY KEY REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT FALSE,
  price_5min numeric DEFAULT 0 CHECK (price_5min >= 0),
  price_10min numeric DEFAULT 0 CHECK (price_10min >= 0),
  price_15min numeric DEFAULT 0 CHECK (price_15min >= 0),
  price_30min numeric DEFAULT 0 CHECK (price_30min >= 0),
  min_notice_hours numeric DEFAULT 0.083 CHECK (min_notice_hours >= 0), -- 5 minutes
  max_bookings_per_day integer DEFAULT 5 CHECK (max_bookings_per_day >= 0),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE streaming_settings ENABLE ROW LEVEL SECURITY;

-- Policy for influencers to manage their own streaming settings
CREATE POLICY "Influencers can manage their own streaming settings" ON streaming_settings
FOR ALL TO authenticated
USING (
  (SELECT user_id FROM influencer_profiles WHERE id = influencer_id) = auth.uid()
) WITH CHECK (
  (SELECT user_id FROM influencer_profiles WHERE id = influencer_id) = auth.uid()
);

-- Policy for authenticated users to view streaming settings of all influencers (to book)
CREATE POLICY "Authenticated users can view all streaming settings" ON streaming_settings
FOR SELECT TO authenticated
USING (TRUE);