
-- Function to call Zapier webhook when a new user signs up
CREATE OR REPLACE FUNCTION public.trigger_zapier_on_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- First, log the event for debugging
  RAISE NOTICE 'Zapier webhook trigger fired for user: %', NEW.id;
  
  -- Make an HTTP request to the Zapier webhook
  PERFORM
    net.http_post(
      url := 'https://hooks.zapier.com/hooks/catch/2648556/2plv5iy/',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'uid', NEW.id,
        'email', NEW.email,
        'created_at', NEW.created_at
      )::text
    );
  
  -- Return the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires the function after a new user is inserted
DROP TRIGGER IF EXISTS on_auth_user_created_zapier ON auth.users;
CREATE TRIGGER on_auth_user_created_zapier
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.trigger_zapier_on_new_user();

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to check if pg_net extension is enabled (for validation)
CREATE OR REPLACE FUNCTION public.check_pg_net_extension()
RETURNS TABLE (name text, version text) AS $$
BEGIN
  RETURN QUERY SELECT e.extname::text, e.extversion::text
    FROM pg_extension e
    WHERE e.extname = 'pg_net';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record the migration for validation purposes
INSERT INTO public.migrations (name, executed_at)
VALUES ('20250501_create_zapier_webhook', NOW())
ON CONFLICT (name) DO NOTHING;
