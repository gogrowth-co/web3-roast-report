
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
    let roastId = requestData.roastId;
    const { sessionId, url: requestedUrl } = requestData;

    // Validate environment variables (needed either way)
    const { supabaseUrl, supabaseKey, screenshotApiKey, geminiApiKey, geminiApiKey2, openRouterApiKey } = validateEnvironmentVars();

    // No roastId means the caller is a logged-out visitor asking for a fresh
    // free roast. anonymous_roasts INSERT is locked to service_role only
    // (see migration 20260421213859) -- the browser can't create this row
    // itself, so this function does it, using the same elevated key it
    // already holds to read/update roasts below. This is the whole fix for
    // "free tier isn't actually free": before this, the client had no way
    // to create an anonymous roast at all and UrlForm.tsx fell back to
    // forcing a login first.
    if (!roastId) {
      if (!requestedUrl || !sessionId) {
        throw new Error('Missing url or sessionId for a new anonymous roast');
      }

      // Daily cap per IP (not just sessionId -- that's a client-controlled
      // localStorage value, trivially reset). Each anonymous roast is a real
      // scrape + screenshot + AI call, so this is a cost guard, not a UX
      // nicety. Separate rate_limits key from the per-roastId retry-throttle
      // used further down, same check_rate_limit RPC, same rate_limits table.
      const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
      const dailyCapKey = `daily-free-roast:${clientIP}`;
      console.log("Checking daily free-roast cap for key:", dailyCapKey);
      const dailyCapResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit_key: dailyCapKey,
          max_requests: 3,
          window_minutes: 1440,
        }),
      });

      if (dailyCapResponse.ok) {
        const isAllowed = await dailyCapResponse.json();
        if (!isAllowed) {
          console.error("Daily free-roast cap exceeded for key:", dailyCapKey);
          throw new Error('Free roast limit reached for today. Please try again tomorrow, or sign up to continue.');
        }
      } else {
        console.warn("Daily cap check failed, proceeding anyway");
      }

      // Same-session, same-URL resubmission hits the table's own
      // unique_session_url constraint -- reuse that existing row instead of
      // erroring, so a page refresh or double-click doesn't fail or burn a
      // second analysis. A row stuck on 'failed' gets reset to 'pending' so
      // resubmitting after a transient failure actually retries instead of
      // permanently returning the same dead result (the status check further
      // down only accepts 'pending', 'processing', or 'completed').
      const existingResponse = await fetch(
        `${supabaseUrl}/rest/v1/anonymous_roasts?session_id=eq.${encodeURIComponent(sessionId)}&url=eq.${encodeURIComponent(requestedUrl)}&select=id,status`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
        }
      );
      const existingRows = existingResponse.ok ? await existingResponse.json() : [];

      if (existingRows.length > 0) {
        roastId = existingRows[0].id;
        if (existingRows[0].status === 'failed') {
          console.log("Resetting failed anonymous roast for retry:", roastId);
          await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'pending', { error_message: null }, true);
        } else {
          console.log("Reusing existing anonymous roast for this session+url:", roastId);
        }
      } else {
        const createResponse = await fetch(`${supabaseUrl}/rest/v1/anonymous_roasts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            session_id: sessionId,
            url: requestedUrl,
            status: 'pending',
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error("Failed to create anonymous roast:", errorText);
          throw new Error('Failed to start your free roast. Please try again.');
        }

        const [createdRow] = await createResponse.json();
        roastId = createdRow.id;
        console.log("Created new anonymous roast:", roastId);
      }

      // Return here, fast, without running the pipeline below. The client
      // (UrlForm.tsx) is waiting on this call synchronously to get a
      // roastId and navigate to /results/:id -- it must not block on the
      // 30-60s scrape+screenshot+AI pipeline. Results.tsx's useRoastStatus
      // hook independently calls this same function again, WITH the
      // roastId this time, to actually kick off analysis, and polls the
      // row for status the same way the existing logged-in flow already
      // does. Mirrors UrlForm's existing logged-in path exactly: create
      // the row fast, navigate, let the results page trigger the real work.
      return new Response(JSON.stringify({ success: true, roastId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Starting analysis for roastId:", roastId);

    // Validate request parameters
    validateRequest(roastId);

    // Fetch the roast record from both tables
    console.log("Fetching roast details");
    let roastData;
    let isAnonymous = false;
    
    // Try roasts table first
    const roastResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}&select=url,status`, {
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
      const anonymousResponse = await fetch(`${supabaseUrl}/rest/v1/anonymous_roasts?id=eq.${roastId}&select=url,status,session_id`, {
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
    
    // Early exit if already processing or completed (idempotent)
    if (roast.status === 'processing' || roast.status === 'completed') {
      console.log("Roast already started, status:", roast.status);
      return new Response(JSON.stringify({ success: true, alreadyStarted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate roast status is pending
    if (roast.status !== 'pending') {
      console.error("Roast is not in pending status:", roast.status);
      throw new Error('Roast has already been processed');
    }
    
    // For anonymous roasts, validate session ID
    if (isAnonymous && sessionId && roast.session_id !== sessionId) {
      console.error("Session ID mismatch");
      throw new Error('Invalid session');
    }
    
    // Rate limiting: Check if this session/IP has exceeded limits (only for pending roasts)
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${sessionId || clientIP}:${roastId}`;
    
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
        { geminiApiKey, geminiApiKey2, openRouterApiKey },
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
      // If there's an error during processing, update the status to failed.
      // Never leave the row on 'processing': if writing error_message fails,
      // fall back to a status-only update so the UI can show an error state.
      console.error("Error during analysis processing:", processingError);
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      try {
        await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'failed', {
          error_message: errorMessage.slice(0, 1000)
        }, isAnonymous);
      } catch (statusError) {
        console.error("Failed to record error_message, falling back to status-only update:", statusError);
        try {
          await updateRoastStatus(supabaseUrl, supabaseKey, roastId, 'failed', {}, isAnonymous);
        } catch (fallbackError) {
          console.error("Fallback status update also failed:", fallbackError);
        }
      }
      throw processingError;
    }

  } catch (error) {
    return handleErrorResponse(error as Error, req);
  }
});
