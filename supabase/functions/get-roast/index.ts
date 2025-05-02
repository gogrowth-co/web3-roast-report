
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const body = await req.json();
    const id = body.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First try to get from roast_results table
    let { data: resultData, error: resultError } = await supabase
      .from('roast_results')
      .select('result_json')
      .eq('roast_id', id)
      .single();
    
    // If no result found in roast_results, try to get directly from roasts table
    if (resultError || !resultData) {
      console.log("No persisted result found, trying roasts table directly");
      
      const { data: roastData, error: roastError } = await supabase
        .from('roasts')
        .select('*')
        .eq('id', id)
        .single();
        
      if (roastError || !roastData) {
        console.error("Error fetching roast:", roastError);
        return new Response(JSON.stringify({ error: "Roast not found" }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (roastData.status !== 'completed') {
        return new Response(JSON.stringify({ error: "Roast analysis not completed yet", status: roastData.status }), {
          status: 202, // Accepted but processing
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Transform roast data into the expected format
      const transformedData = {
        url: roastData.url,
        score: roastData.score,
        summary: roastData.ai_analysis?.feedback
          ?.filter(f => f.severity === 'high')
          ?.map(f => f.feedback)
          ?.join('. ') || 'Web3 project analyzed successfully',
        findings: roastData.ai_analysis?.feedback?.map(f => ({
          category: f.category,
          severity: f.severity,
          feedback: f.feedback
        })) || [],
        categories: roastData.ai_analysis?.categoryScores || {},
        screenshot_url: roastData.screenshot_url || ''
      };
      
      return new Response(JSON.stringify(transformedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Return the result from roast_results if found
    return new Response(JSON.stringify(resultData.result_json), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Unexpected error in get-roast function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
