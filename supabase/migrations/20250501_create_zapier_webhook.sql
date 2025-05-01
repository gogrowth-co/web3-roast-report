
-- Function to call Zapier webhook when a new user signs up
CREATE OR REPLACE FUNCTION public.trigger_zapier_on_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
