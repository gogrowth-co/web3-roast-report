
-- Create storage bucket for roast screenshots if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'roast-screenshots', 'roast-screenshots', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'roast-screenshots'
);

-- Set policy to allow public access to screenshots
CREATE POLICY IF NOT EXISTS "Allow public read access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'roast-screenshots');

-- Set policy to allow service role to insert/update screenshots
CREATE POLICY IF NOT EXISTS "Allow service role to insert screenshots" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'roast-screenshots');

CREATE POLICY IF NOT EXISTS "Allow service role to update screenshots" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'roast-screenshots');
