
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers for the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Admin key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables for Supabase connection');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Query to get database function information
    const { data, error } = await supabase
      .from('pg_proc')
      .select('*')
      .or('proname.eq.trigger_zapier_on_new_user')
      .limit(1);

    if (error) {
      throw error;
    }

    // Check if the pg_net extension is enabled
    const { data: extensions, error: extError } = await supabase.rpc('check_pg_net_extension');
    
    if (extError) {
      throw extError;
    }

    return new Response(JSON.stringify({
      functionExists: data && data.length > 0,
      pgNetEnabled: extensions && extensions.length > 0,
      message: "Function information retrieved successfully"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error("Error processing function info request:", error);
    return new Response(JSON.stringify({
      error: error.message || "An unknown error occurred"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
