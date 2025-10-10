
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
    const { roastId, sessionId } = requestData;
    
    console.log("Starting analysis for roastId:", roastId);
    
    // Validate request parameters
    validateRequest(roastId);

    // Validate environment variables
    const { supabaseUrl, supabaseKey, screenshotApiKey, openAIApiKey } = validateEnvironmentVars();
    
    // Rate limiting: Check if this session/IP has exceeded limits
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = sessionId || clientIP;
    
    console.log("Checking rate limit for key:", rateLimitKey);
    const rateLimitResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit_key: rateLimitKey,
        max_requests: 5,
        window_minutes: 60
      })
    });
    
    if (rateLimitResponse.ok) {
      const isAllowed = await rateLimitResponse.json();
      if (!isAllowed) {
        console.error("Rate limit exceeded for key:", rateLimitKey);
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    } else {
      console.warn("Rate limit check failed, proceeding anyway");
    }
    
    // Fetch the roast record from both tables
    console.log("Fetching roast details");
    let roastData;
    let isAnonymous = false;
    
    // Try roasts table first
    const roastResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}&select=url`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    });
    
    if (roastResponse.ok) {
      const data = await roastResponse.json();
      if (data && data.length > 0) {
        roastData = data[0];
        console.log("Found roast in roasts table");
      }
    }
    
    // If not found, try anonymous_roasts table
    if (!roastData) {
      console.log("Roast not found in roasts table, checking anonymous_roasts");
      const anonymousResponse = await fetch(`${supabaseUrl}/rest/v1/anonymous_roasts?id=eq.${roastId}&select=url`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        }
      });
      
      if (anonymousResponse.ok) {
        const data = await anonymousResponse.json();
        if (data && data.length > 0) {
          roastData = data[0];
          isAnonymous = true;
          console.log("Found roast in anonymous_roasts table");
        }
      }
    }
    
    if (!roastData) {
      console.error("Roast not found in either table");
      throw new Error('Roast not found');
    }
    
    const roast = roastData;
    if (!roast.url) {
      console.error("Roast URL is missing");
      throw new Error('Roast URL is missing');
    }
    
    // Validate roast status
    if (roast.status !== 'pending') {
      console.error("Roast is not in pending status:", roast.status);
      throw new Error('Roast has already been processed');
    }
    
    // For anonymous roasts, validate session ID
    if (isAnonymous && sessionId && roast.session_id !== sessionId) {
      console.error("Session ID mismatch");
      throw new Error('Invalid session');
    }
    
    console.log("Found roast with URL:", roast.url);
    
    // Update status to processing
    await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'processing', {}, isAnonymous);

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
      await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'completed', updateData, isAnonymous);

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
      }, isAnonymous);
      throw processingError;
    }
  } catch (error) {
    return handleErrorResponse(error as Error, req);
  }
});
