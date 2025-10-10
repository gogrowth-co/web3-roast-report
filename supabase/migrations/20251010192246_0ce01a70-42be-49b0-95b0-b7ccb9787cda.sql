-- Fix 1: Restrict anonymous_roasts SELECT to only session owners or claimed users
DROP POLICY IF EXISTS "Anyone can read anonymous roasts" ON anonymous_roasts;

CREATE POLICY "Users can only read their own anonymous roasts"
ON anonymous_roasts FOR SELECT
USING (
  claimed_by_user_id = auth.uid()
  OR id IN (
    SELECT id FROM anonymous_roasts 
    WHERE session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
  )
);

-- Fix 2: Restrict purchases UPDATE to service role only
DROP POLICY IF EXISTS "Edge functions can update purchases" ON purchases;

CREATE POLICY "Only service role can update purchases"
ON purchases FOR UPDATE
USING ((auth.jwt()->>'role')::text = 'service_role');

-- Fix 3: Add URL validation constraints and triggers
-- Add length constraints
ALTER TABLE roasts ADD CONSTRAINT url_length_check CHECK (length(url) <= 2048);
ALTER TABLE anonymous_roasts ADD CONSTRAINT url_length_check CHECK (length(url) <= 2048);

-- Create URL validation function
CREATE OR REPLACE FUNCTION validate_url_safety()
RETURNS TRIGGER AS $$
BEGIN
  -- Block localhost, private networks, and cloud metadata endpoints
  IF NEW.url ~* '(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|169\.254\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))' THEN
    RAISE EXCEPTION 'URL targets private/internal network - potential SSRF attack';
  END IF;
  
  -- Require http or https protocol
  IF NEW.url !~* '^https?://' THEN
    RAISE EXCEPTION 'URL must use http or https protocol';
  END IF;
  
  -- Block file:// and other dangerous protocols
  IF NEW.url ~* '^(file|ftp|data|javascript):' THEN
    RAISE EXCEPTION 'Dangerous URL protocol detected';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation triggers to both tables
DROP TRIGGER IF EXISTS validate_roast_url ON roasts;
CREATE TRIGGER validate_roast_url 
BEFORE INSERT OR UPDATE OF url ON roasts
FOR EACH ROW EXECUTE FUNCTION validate_url_safety();

DROP TRIGGER IF EXISTS validate_anonymous_roast_url ON anonymous_roasts;
CREATE TRIGGER validate_anonymous_roast_url 
BEFORE INSERT OR UPDATE OF url ON anonymous_roasts
FOR EACH ROW EXECUTE FUNCTION validate_url_safety();

-- Fix 4: Add rate limiting table for analyze-web3 function
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON rate_limits FOR ALL
USING ((auth.jwt()->>'role')::text = 'service_role')
WITH CHECK ((auth.jwt()->>'role')::text = 'service_role');

-- Create rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  limit_key TEXT, 
  max_requests INT DEFAULT 5, 
  window_minutes INT DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
  window_age INTERVAL;
BEGIN
  -- Get current count and window age
  SELECT count, NOW() - window_start INTO current_count, window_age
  FROM rate_limits WHERE key = limit_key;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, count, window_start) 
    VALUES (limit_key, 1, NOW());
    RETURN TRUE;
  END IF;
  
  -- If window expired, reset
  IF window_age > (window_minutes || ' minutes')::INTERVAL THEN
    UPDATE rate_limits SET count = 1, window_start = NOW() WHERE key = limit_key;
    RETURN TRUE;
  END IF;
  
  -- If limit exceeded, reject
  IF current_count >= max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE rate_limits SET count = count + 1 WHERE key = limit_key;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;