
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

    if (!screenshotApiKey) {
      throw new Error('Screenshot API key not configured')
    }
    
    // Fetch the roast record to get the URL
    const roastResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}&select=url`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    });
    
    const [roast] = await roastResponse.json();
    if (!roast) throw new Error('Roast not found');
    
    console.log("Found roast with URL:", roast.url);

    // Capture screenshot using APIFlash
    const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${screenshotApiKey}&url=${encodeURIComponent(roast.url)}&full_page=true&format=jpeg&quality=90&wait_until=page_loaded`;
    console.log("Capturing screenshot with URL:", screenshotUrl);
    
    const screenshotResponse = await fetch(screenshotUrl);

    if (!screenshotResponse.ok) {
      console.error("Screenshot API response:", await screenshotResponse.text());
      throw new Error(`Failed to capture screenshot: ${screenshotResponse.statusText}`);
    }

    const screenshotBlob = await screenshotResponse.blob();
    console.log("Screenshot captured successfully, size:", screenshotBlob.size);
    
    // Store the screenshot in Supabase Storage
    const screenshotPath = `screenshots/${roastId}.jpg`;
    const storageUrl = `${supabaseUrl}/storage/v1/object/public/roast-screenshots/${screenshotPath}`;
    
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
      console.error("Storage API response:", await storageResponse.text());
      throw new Error('Failed to store screenshot');
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
      console.error("OpenAI API response:", await openAIResponse.text());
      throw new Error('Failed to generate AI analysis');
    }

    const aiData = await openAIResponse.json();
    console.log("OpenAI analysis completed successfully");
    
    const analysis = JSON.parse(aiData.choices[0].message.content);

    // Update roast record with results
    console.log("Updating roast record with analysis results");
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        screenshot_url: finalScreenshotUrl,
        ai_analysis: analysis,
        status: 'completed',
        score: analysis.score,
        completed_at: new Date().toISOString()
      })
    });

    if (!updateResponse.ok) {
      console.error("Update API response:", await updateResponse.text());
      throw new Error('Failed to update analysis in database');
    }

    console.log("Analysis completed and stored successfully for roastId:", roastId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-web3 function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

