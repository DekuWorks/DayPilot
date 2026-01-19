-- AI Generate Day Feature
-- Adds support for AI-powered day generation with preview and apply

-- Add AI fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '17:00:00',
  ADD COLUMN IF NOT EXISTS focus_block_duration INTEGER DEFAULT 90; -- minutes

-- AI actions table
CREATE TABLE IF NOT EXISTS ai_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'generate_day' CHECK (action_type IN ('generate_day')),
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'rejected')),
  created_events JSONB DEFAULT '[]', -- Array of event IDs created when applied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_actions_user_id ON ai_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_status ON ai_actions(status);
CREATE INDEX IF NOT EXISTS idx_ai_actions_created_at ON ai_actions(created_at DESC);

-- RLS Policies for ai_actions
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI actions"
  ON ai_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI actions"
  ON ai_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI actions"
  ON ai_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI actions"
  ON ai_actions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_ai_actions_updated_at
  BEFORE UPDATE ON ai_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check AI entitlement
CREATE OR REPLACE FUNCTION check_ai_entitlement(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT ai_enabled, ai_credits INTO profile_record
  FROM profiles
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- User has AI enabled OR has credits remaining
  RETURN profile_record.ai_enabled OR (profile_record.ai_credits > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement AI credits
CREATE OR REPLACE FUNCTION decrement_ai_credits(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE profiles
  SET ai_credits = GREATEST(0, ai_credits - 1)
  WHERE id = user_uuid
  RETURNING ai_credits INTO new_credits;
  
  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
