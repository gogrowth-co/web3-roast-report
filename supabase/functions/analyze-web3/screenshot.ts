
import { corsHeaders } from './utils.ts';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`Retrying fetch to ${url}, ${retries} attempts left`);
    await delay(RETRY_DELAY);
    return fetchWithRetry(url, options, retries - 1);
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

    // Capture screenshot using APIFlash with proper 1024x768 dimensions
    console.log("Capturing screenshot for URL:", url);
    const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${screenshotApiKey}&url=${encodeURIComponent(url)}&format=jpeg&quality=90&dimension=1024x768`;
    
    const screenshotResponse = await fetchWithRetry(screenshotUrl, {});

    const screenshotBlob = await screenshotResponse.blob();
    console.log("Screenshot captured successfully, size:", screenshotBlob.size, "bytes");
    
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
    console.log("Screenshot stored successfully at:", finalScreenshotUrl);
    
    return finalScreenshotUrl;
  } catch (error) {
    console.error("Error in screenshot capture:", error);
    throw new Error(`Screenshot capture failed: ${error.message}`);
  }
}
