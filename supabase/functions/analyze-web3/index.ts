
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

import { corsHeaders, handleErrorResponse, validateEnvironmentVars, updateRoastStatus } from "./utils.ts";
import { captureAndStoreScreenshot } from "./screenshot.ts";
import { generateWebsiteAnalysis, validateAnalysis } from "./openai.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Extract request data
    const { roastId } = await req.json()
    console.log("Starting analysis for roastId:", roastId);

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
      console.error("Failed to fetch roast details:", await roastResponse.text());
      throw new Error('Failed to fetch roast details');
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

  } catch (error) {
    return handleErrorResponse(error, req);
  }
});
