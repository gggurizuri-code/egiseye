/*
  # Add subscription system

  1. Changes
    - Add subscription_tier column to users table
    - Add usage_limits table for tracking daily usage
    - Add functions for checking and updating usage limits
    - Add policies for usage tracking

  2. Security
    - Enable RLS on usage_limits table
    - Add policies for authenticated users
*/

-- Add subscription_tier to users table
ALTER TABLE users 
ADD COLUMN subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));

-- Create usage_limits table
CREATE TABLE usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date DEFAULT CURRENT_DATE,
  scans_count integer DEFAULT 0,
  chatbot_messages_count integer DEFAULT 0,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage"
  ON usage_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON usage_limits
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check if user has reached daily limit
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id uuid,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_tier text;
  v_current_usage record;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM users
  WHERE user_id = p_user_id;

  -- Premium users have no limits
  IF v_subscription_tier = 'premium' THEN
    RETURN true;
  END IF;

  -- Get current usage
  SELECT * INTO v_current_usage
  FROM usage_limits
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  -- If no record exists for today, create one
  IF NOT FOUND THEN
    INSERT INTO usage_limits (user_id, date)
    VALUES (p_user_id, CURRENT_DATE)
    RETURNING * INTO v_current_usage;
  END IF;

  -- Check limits based on action
  CASE p_action
    WHEN 'scan' THEN
      RETURN v_current_usage.scans_count < 7;
    WHEN 'chatbot' THEN
      RETURN v_current_usage.chatbot_messages_count < 10;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id uuid,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO usage_limits (user_id, date, scans_count, chatbot_messages_count)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_action = 'scan' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'chatbot' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    scans_count = CASE 
      WHEN p_action = 'scan' 
      THEN usage_limits.scans_count + 1 
      ELSE usage_limits.scans_count 
    END,
    chatbot_messages_count = CASE 
      WHEN p_action = 'chatbot' 
      THEN usage_limits.chatbot_messages_count + 1 
      ELSE usage_limits.chatbot_messages_count 
    END;
END;
$$;