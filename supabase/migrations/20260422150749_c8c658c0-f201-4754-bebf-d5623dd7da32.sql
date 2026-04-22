
-- 1. Fix infinite recursion on anonymous_roasts SELECT policy
DROP POLICY IF EXISTS "Users can only read their own anonymous roasts" ON public.anonymous_roasts;

CREATE POLICY "Users can only read their own anonymous roasts"
ON public.anonymous_roasts
FOR SELECT
USING (
  claimed_by_user_id = auth.uid()
);

-- 2. Restrict shared_roasts INSERT to roast owners only
DROP POLICY IF EXISTS "Authenticated users can create shared links" ON public.shared_roasts;

CREATE POLICY "Users can create shared links for their own roasts"
ON public.shared_roasts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roasts
    WHERE roasts.id = shared_roasts.roast_id
      AND roasts.user_id = auth.uid()
  )
);

-- 3. Lock down storage uploads to roast-screenshots bucket to service role only
DROP POLICY IF EXISTS "Edge Function Upload to Roast Screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload roast screenshots" ON storage.objects;

CREATE POLICY "Service role can upload roast screenshots"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'roast-screenshots'
  AND (auth.jwt() ->> 'role') = 'service_role'
);

CREATE POLICY "Service role can update roast screenshots"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'roast-screenshots'
  AND (auth.jwt() ->> 'role') = 'service_role'
);

CREATE POLICY "Service role can delete roast screenshots"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'roast-screenshots'
  AND (auth.jwt() ->> 'role') = 'service_role'
);
