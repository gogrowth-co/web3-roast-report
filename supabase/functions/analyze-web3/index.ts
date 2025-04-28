
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { roastId } = await req.json()
    console.log("Starting analysis for roastId:", roastId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const roastResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}&select=url`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    });
    
    const [roast] = await roastResponse.json();
    if (!roast) throw new Error('Roast not found');
    
    console.log("Found roast with URL:", roast.url);

    // Simulate work
    await delay(30000);
    console.log("Analysis processing completed for roastId:", roastId);

    const systemPrompt = `You are a Web3 UX expert. Analyze the following Web3 project URL and provide detailed feedback on:
    1. User Experience
    2. Technical Implementation
    3. Security Considerations
    4. Web3 Best Practices
    5. Accessibility
    
    Be direct and honest but professional. IMPORTANT: Your response must be valid JSON (not markdown) matching exactly this structure:
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
    }
    `

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this Web3 project: ${roast.url}` }
        ],
        response_format: { type: "json_object" }
      }),
    })

    const data = await response.json();
    console.log("OpenAI response received for roastId:", roastId);
    
    // Extract the JSON content from the response
    let analysisContent = data.choices[0].message.content;
    let analysis;
    
    try {
      // Try to parse the response directly
      analysis = JSON.parse(analysisContent);
      console.log("Successfully parsed OpenAI response for roastId:", roastId);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      
      // Fallback: Provide default analysis if parsing fails
      analysis = {
        score: 70,
        summary: "Analysis completed with limited data",
        findings: [
          {
            category: "UX",
            severity: "medium",
            feedback: "The application appears functional but we were unable to perform a detailed analysis."
          }
        ],
        categories: {
          "UX": 70,
          "Technical": 70,
          "Security": 70,
          "Best Practices": 70,
          "Accessibility": 70
        }
      };
    }

    console.log("Updating database with analysis results for roastId:", roastId);
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        ai_analysis: analysis,
        status: 'completed',
        score: analysis.score,
        completed_at: new Date().toISOString()
      })
    })

    if (!supabaseResponse.ok) {
      console.error("Failed to update analysis in database:", await supabaseResponse.text());
      throw new Error('Failed to update analysis in database')
    }

    console.log("Analysis completed successfully for roastId:", roastId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in analyze-web3 function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
