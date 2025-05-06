
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

    // Capture screenshot using APIFlash with proper 1024x768 dimensions
    console.log("Capturing screenshot for URL:", roast.url);
    const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${screenshotApiKey}&url=${encodeURIComponent(roast.url)}&format=jpeg&quality=90&dimension=1024x768`;
    
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
    
    // Generate analysis with OpenAI - UPDATED SYSTEM PROMPT
    console.log("Starting OpenAI analysis for URL:", roast.url);
    
    const systemPrompt = `You are a Web3 landing page conversion expert analyzing the page at ${roast.url}.

Your job is to deliver a brutally honest, constructive **CRO + UX teardown** for this Web3 or crypto-native landing page. Apply both **modern conversion rate optimization principles** and **Web3-specific credibility signals**.

Focus especially on:
- Messaging clarity
- On-chain culture fluency
- Trust-building elements
- Web3-specific proof
- UX flow and visual hierarchy
- Call-to-action logic

Use this exact structure in your output. Format your response as valid JSON only. Do not add explanations or any extra commentary outside the object.

{
  "heroSection": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Concise, actionable critique about the headline/subheadline/CTA clarity and benefit."
  },
  "trustAndSocialProof": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Comment on testimonials, logos, credibility metrics, or lack thereof."
  },
  "messagingClarity": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Note vague language, jargon, lack of buyer-centric phrasing, or feature-dumping."
  },
  "ctaStrategy": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Evaluate visibility, urgency, value clarity, and placement of calls-to-action."
  },
  "visualFlow": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Assess visual hierarchy, scannability, mobile flow, or image use."
  },
  "web3Relevance": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Does the landing page show it's truly Web3-native? Is there token data, protocol context, or culture fluency?"
  },
  "fixMap": [
    {
      "issue": "Short description of problem",
      "severity": "high|medium|low",
      "suggestedFix": "One-liner solution or rewrite suggestion"
    }
  ],
  "suggestedRewrite": {
    "headline": "Only if hero copy is weak – suggest a better headline here.",
    "subheadline": "Suggest a more benefit-driven, pain-aware subheadline here."
  },
  "overallScore": <0–100>
}

You may use the scraped text and screenshot URL (${finalScreenshotUrl}) if needed. Prioritize clarity and Web3 relevance over being nice. Be punchy, direct, and write like you're advising a founder who wants the truth, fast.`;

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
        ]
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
      
      // Update validations for the new response format
      if (!analysis.overallScore) {
        throw new Error('Incomplete analysis data: missing overallScore');
      }
      
      // Transform the new format to be compatible with the frontend
      const transformedAnalysis = {
        overallScore: analysis.overallScore,
        categoryScores: {
          "Hero Section": analysis.heroSection.score,
          "Trust & Social Proof": analysis.trustAndSocialProof.score,
          "Messaging Clarity": analysis.messagingClarity.score,
          "CTA Strategy": analysis.ctaStrategy.score,
          "Visual Flow": analysis.visualFlow.score,
          "Web3 Relevance": analysis.web3Relevance.score
        },
        feedback: [
          {
            category: "Hero Section",
            severity: analysis.heroSection.severity,
            feedback: analysis.heroSection.feedback
          },
          {
            category: "Trust & Social Proof",
            severity: analysis.trustAndSocialProof.severity,
            feedback: analysis.trustAndSocialProof.feedback
          },
          {
            category: "Messaging Clarity",
            severity: analysis.messagingClarity.severity,
            feedback: analysis.messagingClarity.feedback
          },
          {
            category: "CTA Strategy",
            severity: analysis.ctaStrategy.severity,
            feedback: analysis.ctaStrategy.feedback
          },
          {
            category: "Visual Flow",
            severity: analysis.visualFlow.severity,
            feedback: analysis.visualFlow.feedback
          },
          {
            category: "Web3 Relevance",
            severity: analysis.web3Relevance.severity,
            feedback: analysis.web3Relevance.feedback
          }
        ],
        // Include original data for advanced use
        rawAnalysis: analysis
      };
      
      // Replace the analysis with our transformed version
      analysis = transformedAnalysis;
      
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
      score: analysis.overallScore,
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
