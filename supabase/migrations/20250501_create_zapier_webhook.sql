
-- Function to call Zapier webhook when a new user signs up
CREATE OR REPLACE FUNCTION public.trigger_zapier_on_new_user()
RETURNS TRIGGER AS $$
DECLARE
  response JSONB;
  status INT;
  error_message TEXT;
BEGIN
  -- Log the event for debugging
  RAISE LOG 'Zapier webhook trigger fired for user: %, email: %', NEW.id, NEW.email;
  
  -- Make an HTTP request to the Zapier webhook
  SELECT 
    INTO status, response, error_message
    result_status, result_body::jsonb, COALESCE(error_message, '') 
  FROM net.http_post(
    url := 'https://hooks.zapier.com/hooks/catch/2648556/2plv5iy/',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'uid', NEW.id,
      'email', NEW.email,
      'created_at', NEW.created_at
    )::text
  );
  
  -- Log the response
  RAISE LOG 'Zapier webhook response: status=%, body=%, error=%', status, response, error_message;
  
  -- Return the new record
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Zapier webhook error: %', SQLERRM;
  RETURN NEW; -- Still return NEW to avoid blocking user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires the function after a new user is inserted
DROP TRIGGER IF EXISTS on_auth_user_created_zapier ON auth.users;
CREATE TRIGGER on_auth_user_created_zapier
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.trigger_zapier_on_new_user();

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- Create a reliable way to track webhook executions for debugging
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status INT,
  response JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update function to log webhook attempts
CREATE OR REPLACE FUNCTION public.log_webhook_attempt()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.webhook_logs (user_id, event_type, payload)
  VALUES (
    NEW.id,
    'user_created', 
    jsonb_build_object(
      'uid', NEW.id,
      'email', NEW.email,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to log webhook attempts
DROP TRIGGER IF EXISTS on_auth_user_created_log ON auth.users;
CREATE TRIGGER on_auth_user_created_log
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.log_webhook_attempt();

-- Record the migration for validation purposes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migrations') THEN
    CREATE TABLE public.migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
  
  INSERT INTO public.migrations (name, executed_at)
  VALUES ('20250501_create_zapier_webhook', NOW())
  ON CONFLICT (name) DO UPDATE SET executed_at = NOW();
END
$$;
