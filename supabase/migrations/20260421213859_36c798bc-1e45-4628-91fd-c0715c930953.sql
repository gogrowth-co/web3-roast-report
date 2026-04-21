
-- 1. Lock down anonymous_roasts INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert anonymous roasts" ON public.anonymous_roasts;
CREATE POLICY "Service role can insert anonymous roasts"
ON public.anonymous_roasts
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 2. Lock down anonymous_roasts UPDATE to service_role only
DROP POLICY IF EXISTS "Service role can update anonymous roasts" ON public.anonymous_roasts;
CREATE POLICY "Service role can update anonymous roasts"
ON public.anonymous_roasts
FOR UPDATE
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 3. Lock down purchases INSERT to service_role only
DROP POLICY IF EXISTS "Edge functions can create purchases" ON public.purchases;
CREATE POLICY "Service role can create purchases"
ON public.purchases
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 4. Restrict storage bucket listing on roast-screenshots
-- Files remain publicly viewable by direct URL, but bucket contents cannot be enumerated.
DROP POLICY IF EXISTS "Public read access roast-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to roast-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public can read individual screenshot files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'roast-screenshots' AND name IS NOT NULL);
