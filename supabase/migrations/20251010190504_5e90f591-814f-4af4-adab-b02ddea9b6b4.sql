-- Create table for anonymous roasts that expire after 24 hours
CREATE TABLE anonymous_roasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  screenshot_url TEXT,
  score INTEGER,
  ai_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  claimed_by_user_id UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  CONSTRAINT unique_session_url UNIQUE(session_id, url)
);

-- Create indexes for performance
CREATE INDEX idx_anonymous_roasts_expires ON anonymous_roasts(expires_at);
CREATE INDEX idx_anonymous_roasts_session ON anonymous_roasts(session_id);
CREATE INDEX idx_anonymous_roasts_status ON anonymous_roasts(status);

-- Add RLS policies
ALTER TABLE anonymous_roasts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read anonymous roasts (session validation done in edge function)
CREATE POLICY "Anyone can read anonymous roasts"
ON anonymous_roasts FOR SELECT
USING (true);

-- Allow service role to insert anonymous roasts
CREATE POLICY "Service role can insert anonymous roasts"
ON anonymous_roasts FOR INSERT
WITH CHECK (true);

-- Allow service role to update anonymous roasts
CREATE POLICY "Service role can update anonymous roasts"
ON anonymous_roasts FOR UPDATE
USING (true);