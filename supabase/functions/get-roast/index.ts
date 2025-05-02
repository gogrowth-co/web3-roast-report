
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
    // This allows public access to roast results for sharing
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch the roast result
    const { data, error } = await supabase
      .from('roast_results')
      .select('result_json')
      .eq('roast_id', id)
      .single();
    
    if (error) {
      console.error("Error fetching roast result:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch roast result" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!data) {
      return new Response(JSON.stringify({ error: "Roast result not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Return the result
    return new Response(JSON.stringify(data.result_json), {
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
