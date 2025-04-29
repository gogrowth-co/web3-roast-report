
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { roastId } = await req.json()
    console.log("Starting analysis for roastId:", roastId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY')
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Supabase configuration not found');
    }

    if (!screenshotApiKey) {
      console.error('Screenshot API key not configured');
      throw new Error('Screenshot API key not configured');
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }
    
    // Update status to processing
    console.log("Updating roast status to 'processing'");
    await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        status: 'processing'
      })
    });
    
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

    // Verify the bucket exists before trying to upload
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

    // Capture screenshot using APIFlash with proper error handling
    console.log("Capturing screenshot for URL:", roast.url);
    const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${screenshotApiKey}&url=${encodeURIComponent(roast.url)}&full_page=true&format=jpeg&quality=90&wait_until=page_loaded`;
    
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
    
    // Generate analysis with OpenAI
    console.log("Starting OpenAI analysis for URL:", roast.url);
    
    const systemPrompt = `You are a Web3 UX expert. Analyze the following Web3 project URL and provide detailed feedback on:
    1. User Experience
    2. Technical Implementation
    3. Security Considerations
    4. Web3 Best Practices
    5. Accessibility
    
    The user has submitted this URL: ${roast.url}
    
    I have captured a screenshot of the website for your reference at: ${finalScreenshotUrl}
    
    Please review both the URL and the screenshot to provide a comprehensive analysis.
    
    Be direct and honest but professional. Your response must be in this JSON structure:
    {
      "score": number from 0-100,
      "summary": "brief overall assessment",
      "findings": [
        {
          "category": "UX/Technical/Security/Best Practices/Accessibility",
          "severity": "low/medium/high",
          "feedback": "detailed explanation"
        }
      ],
      "categories": {
        "UX": number from 0-100,
        "Technical": number from 0-100,
        "Security": number from 0-100,
        "Best Practices": number from 0-100,
        "Accessibility": number from 0-100
      }
    }`;

    console.log("Sending request to OpenAI");
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please analyze this Web3 project at ${roast.url} with its screenshot at ${finalScreenshotUrl}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`Failed to generate AI analysis: ${openAIResponse.status} ${openAIResponse.statusText}`);
    }

    const aiData = await openAIResponse.json();
    console.log("OpenAI analysis completed successfully");
    
    if (!aiData.choices || aiData.choices.length === 0 || !aiData.choices[0].message || !aiData.choices[0].message.content) {
      console.error("Invalid OpenAI response format:", aiData);
      throw new Error('Invalid response from OpenAI API');
    }
    
    let analysis;
    try {
      analysis = JSON.parse(aiData.choices[0].message.content);
      console.log("Analysis parsed successfully");
      
      if (!analysis.score || !analysis.summary || !analysis.findings || !analysis.categories) {
        console.error("Analysis missing required fields:", analysis);
        throw new Error('Incomplete analysis data from OpenAI');
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, aiData.choices[0].message.content);
      throw new Error('Failed to parse analysis response');
    }

    // Update roast record with results
    console.log("Updating roast record with analysis results");
    const updateData = {
      screenshot_url: finalScreenshotUrl,
      ai_analysis: analysis,
      status: 'completed',
      score: analysis.score,
      completed_at: new Date().toISOString()
    };
    
    console.log("Update data:", JSON.stringify(updateData));
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Update API error:", errorText);
      throw new Error(`Failed to update analysis in database: ${errorText}`);
    }

    console.log("Analysis completed and stored successfully for roastId:", roastId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-web3 function:', error);
    
    // Try to update the roast status to failed if possible
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const { roastId } = await req.json();
      
      if (supabaseUrl && supabaseKey && roastId) {
        console.log("Updating roast status to failed for roastId:", roastId);
        await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            status: 'failed',
            error_message: error.message || 'Unknown error'
          })
        });
      }
    } catch (updateError) {
      console.error('Failed to update roast status to failed:', updateError);
    }
    
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
