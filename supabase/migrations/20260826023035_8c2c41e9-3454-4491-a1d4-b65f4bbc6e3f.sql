ALTER TABLE public.roasts ADD COLUMN IF NOT EXISTS error_message text;

UPDATE public.roasts
SET status = 'failed',
    error_message = 'Analysis failed: OpenAI API returned HTTP 429'
WHERE status = 'processing'
  AND ai_analysis IS NULL;