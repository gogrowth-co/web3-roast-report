-- Drop the problematic policy with infinite recursion
DROP POLICY IF EXISTS "Users can only read their own anonymous roasts" ON anonymous_roasts;

-- Create simplified policy without subquery
CREATE POLICY "Users can only read their own anonymous roasts"
ON anonymous_roasts
FOR SELECT
USING (
  claimed_by_user_id = auth.uid()
  OR session_id = (current_setting('request.jwt.claims', true)::json ->> 'session_id')
);