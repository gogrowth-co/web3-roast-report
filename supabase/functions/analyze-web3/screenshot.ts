
import { corsHeaders } from './utils.ts';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const SCREENSHOT_TIMEOUT_MS = 25_000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The APIFlash URL carries the access key as a query param; never log it.
const redact = (url: string) => url.replace(/access_key=[^&]+/, 'access_key=REDACTED');

// timeoutMs bounds each attempt. Without it a hung request (APIFlash on a
// heavy page can sit ~60s) times retries, and the edge runtime kills the
// whole function at its wall-clock limit before any status is written.
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES, timeoutMs?: number): Promise<Response> {
  try {
    const response = await fetch(url, timeoutMs ? { ...options, signal: AbortSignal.timeout(timeoutMs) } : options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    console.log(`Retrying fetch to ${redact(url)}, ${retries} attempts left`);
    await delay(RETRY_DELAY);
    return fetchWithRetry(url, options, retries - 1, timeoutMs);
  }
}

export async function captureAndStoreScreenshot(
  roastId: string,
  url: string,
  supabaseUrl: string,
  supabaseKey: string,
  screenshotApiKey: string
): Promise<string> {
  console.log("Verifying 'roast-screenshots' bucket exists");
  try {
    const bucketCheckResponse = await fetchWithRetry(`${supabaseUrl}/storage/v1/bucket/roast-screenshots`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    });

    if (!bucketCheckResponse.ok) {
      console.error("Bucket verification failed:", await bucketCheckResponse.text());
      throw new Error('Screenshot storage bucket not found. Please create it first.');
    }

    // Capture screenshot using APIFlash with full_page set to true
    console.log("Capturing full page screenshot for URL:", url);
    const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${screenshotApiKey}&url=${encodeURIComponent(url)}&format=jpeg&quality=90&full_page=true&dimension=1024x768`;
    
    // At most two 25s tries (~52s): the caller carries on without a
    // screenshot if this fails, and the AI step still needs time after it.
    const screenshotResponse = await fetchWithRetry(screenshotUrl, {}, 1, SCREENSHOT_TIMEOUT_MS);

    const screenshotBlob = await screenshotResponse.blob();
    console.log("Full page screenshot captured successfully, size:", screenshotBlob.size, "bytes");
    
    if (screenshotBlob.size === 0) {
      console.error("Screenshot capture returned empty image");
      throw new Error("Screenshot capture returned empty image");
    }
    
    // Store the screenshot in Supabase Storage
    const screenshotPath = `screenshots/${roastId}.jpg`;
    const storageUrl = `${supabaseUrl}/storage/v1/object/roast-screenshots/${screenshotPath}`;
    
    console.log("Storing screenshot in Supabase at path:", screenshotPath);
    const storageResponse = await fetchWithRetry(storageUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: screenshotBlob
    });

    const finalScreenshotUrl = `${supabaseUrl}/storage/v1/object/public/roast-screenshots/${screenshotPath}`;
    console.log("Full page screenshot stored successfully at:", finalScreenshotUrl);
    
    return finalScreenshotUrl;
  } catch (error) {
    console.error("Error in screenshot capture:", error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Screenshot capture failed: ${errorMsg}`);
  }
}
