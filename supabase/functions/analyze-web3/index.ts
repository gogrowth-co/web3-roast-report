
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

import { corsHeaders, handleErrorResponse, validateEnvironmentVars, updateRoastStatus, validateRequest } from "./utils.ts";
import { captureAndStoreScreenshot } from "./screenshot.ts";
import { generateWebsiteAnalysis, validateAnalysis } from "./openai.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Extract request data
    const requestData = await req.json();
    const { roastId } = requestData;
    
    console.log("Starting analysis for roastId:", roastId);
    
    // Validate request parameters
    validateRequest(roastId);

    // Validate environment variables
    const { supabaseUrl, supabaseKey, screenshotApiKey, openAIApiKey } = validateEnvironmentVars();
    
    // Update status to processing
    await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'processing');
    
    // Fetch the roast record to get the URL
    console.log("Fetching roast details");
    const roastResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}&select=url`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    });
    
    if (!roastResponse.ok) {
      const errorText = await roastResponse.text();
      console.error("Failed to fetch roast details:", errorText);
      throw new Error(`Failed to fetch roast details: ${roastResponse.status} ${roastResponse.statusText}`);
    }
    
    const roastData = await roastResponse.json();
    if (!roastData || roastData.length === 0) {
      console.error("Roast not found");
      throw new Error('Roast not found');
    }
    
    const roast = roastData[0];
    if (!roast.url) {
      console.error("Roast URL is missing");
      throw new Error('Roast URL is missing');
    }
    
    console.log("Found roast with URL:", roast.url);

    try {
      // Capture and store screenshot
      const finalScreenshotUrl = await captureAndStoreScreenshot(
        roastId, 
        roast.url, 
        supabaseUrl, 
        supabaseKey, 
        screenshotApiKey
      );

      // Generate analysis with OpenAI
      const analysis = await generateWebsiteAnalysis(roast.url, finalScreenshotUrl, openAIApiKey);
      
      // Validate analysis data
      validateAnalysis(analysis);

      // Update roast record with results
      console.log("Updating roast record with analysis results");
      const updateData = {
        screenshot_url: finalScreenshotUrl,
        ai_analysis: analysis,
        status: 'completed',
        score: analysis.overallScore,
        completed_at: new Date().toISOString()
      };
      
      console.log("Update data:", JSON.stringify(updateData));
      await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'completed', updateData);

      console.log("Analysis completed and stored successfully for roastId:", roastId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (processingError) {
      // If there's an error during processing, update the status to failed
      console.error("Error during analysis processing:", processingError);
      await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'failed', {
        error_message: processingError.message
      });
      throw processingError;
    }
  } catch (error) {
    return handleErrorResponse(error, req);
  }
});
</lov-code>

4. Let's also update the screenshot.ts file to add retry logic:

<lov-write file_path="supabase/functions/analyze-web3/screenshot.ts">
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
