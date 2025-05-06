
import { corsHeaders } from './utils.ts';

export async function captureAndStoreScreenshot(
  roastId: string,
  url: string,
  supabaseUrl: string,
  supabaseKey: string,
  screenshotApiKey: string
): Promise<string> {
  console.log("Verifying 'roast-screenshots' bucket exists");
  const bucketCheckResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/roast-screenshots`, {
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
  
  const screenshotResponse = await fetch(screenshotUrl);

  if (!screenshotResponse.ok) {
    const errorText = await screenshotResponse.text();
    console.error("Screenshot API error:", errorText);
    throw new Error(`Failed to capture screenshot: ${screenshotResponse.status} ${screenshotResponse.statusText}. Details: ${errorText}`);
  }

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
  const storageResponse = await fetch(storageUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true'
    },
    body: screenshotBlob
  });

  if (!storageResponse.ok) {
    const errorText = await storageResponse.text();
    console.error("Storage API error:", errorText);
    throw new Error(`Failed to store screenshot: ${errorText}`);
  }

  const finalScreenshotUrl = `${supabaseUrl}/storage/v1/object/public/roast-screenshots/${screenshotPath}`;
  console.log("Screenshot stored successfully at:", finalScreenshotUrl);
  
  return finalScreenshotUrl;
}
