-- Fix search_path warnings for security definer functions
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
$$ LANGUAGE plpgsql
SET search_path = public;

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
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;