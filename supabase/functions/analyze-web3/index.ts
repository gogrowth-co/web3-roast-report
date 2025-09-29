
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

import { corsHeaders, handleErrorResponse, validateEnvironmentVars, updateRoastStatus, validateRequest } from "./utils.ts";
import { captureAndStoreScreenshot } from "./screenshot.ts";
import { generateWebsiteAnalysis, validateAnalysis } from "./openai.ts";
import { scrapeWebsiteContent } from "./scraper.ts";

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
      // Scrape website content for text analysis
      console.log("Scraping website content");
      const scrapedContent = await scrapeWebsiteContent(roast.url);
      
      // Capture and store screenshot
      const finalScreenshotUrl = await captureAndStoreScreenshot(
        roastId, 
        roast.url, 
        supabaseUrl, 
        supabaseKey, 
        screenshotApiKey
      );

      // Generate analysis with OpenAI using both screenshot and scraped content
      const analysis = await generateWebsiteAnalysis(
        roast.url, 
        finalScreenshotUrl, 
        openAIApiKey,
        scrapedContent
      );
      
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
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'failed', {
        error_message: errorMessage
      });
      throw processingError;
    }
  } catch (error) {
    return handleErrorResponse(error as Error, req);
  }
});
