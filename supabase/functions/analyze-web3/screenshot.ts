
import { corsHeaders } from './utils.ts';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const SCREENSHOT_TIMEOUT_MS = 25_000;
// ScreenshotOne gets its own render budget (timeout param) plus a margin
// for the HTTP round trip.
const FALLBACK_RENDER_TIMEOUT_S = 35;
const FALLBACK_FETCH_TIMEOUT_MS = 40_000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The APIFlash URL carries the access key as a query param; never log it.
const redact = (url: string) => url.replace(/access_key=[^&]+/g, 'access_key=REDACTED');

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
  screenshotApiKey: string,
  fallbackApiKey?: string | null
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

    // 1) APIFlash full page, one 25s try. Heavy pages (animated DeFi heroes
    //    such as pendle.finance) time out on a full-page render with any
    //    provider, so a retry here only burns time.
    // 2) ScreenshotOne, top of the page only (1024x768), captured 3s after
    //    DOMContentLoaded: animated/websocket pages never reach "load", so
    //    waiting for it timed out (pendle.finance: 500 at 28s; 13.5s this way).
    //    Also a second monthly quota when APIFlash runs out.
    // Worst case ~65s; the caller continues without a screenshot after that.
    let screenshotBlob: Blob;
    try {
      console.log("Capturing full page screenshot for URL:", url);
      const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${screenshotApiKey}&url=${encodeURIComponent(url)}&format=jpeg&quality=90&full_page=true&dimension=1024x768`;
      const screenshotResponse = await fetchWithRetry(screenshotUrl, {}, 0, SCREENSHOT_TIMEOUT_MS);
      screenshotBlob = await screenshotResponse.blob();
      if (screenshotBlob.size === 0) throw new Error("APIFlash returned an empty image");
    } catch (primaryError) {
      if (!fallbackApiKey) throw primaryError;
      console.warn("APIFlash failed, trying ScreenshotOne (top of page):", primaryError instanceof Error ? primaryError.message : primaryError);
      const fallbackUrl = `https://api.screenshotone.com/take?access_key=${fallbackApiKey}&url=${encodeURIComponent(url)}&full_page=false&format=jpg&image_quality=85&viewport_width=1024&viewport_height=768&block_ads=true&block_cookie_banners=true&wait_until=domcontentloaded&delay=3&timeout=${FALLBACK_RENDER_TIMEOUT_S}`;
      const fallbackResponse = await fetchWithRetry(fallbackUrl, {}, 0, FALLBACK_FETCH_TIMEOUT_MS);
      screenshotBlob = await fallbackResponse.blob();
      console.log("ScreenshotOne fallback captured the top of the page");
    }
    console.log("Screenshot captured, size:", screenshotBlob.size, "bytes");
    
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
