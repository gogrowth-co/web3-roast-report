
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { uid, email, created_at } = await req.json();
    
    if (!uid || !email) {
      return new Response(
        JSON.stringify({ error: "uid and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Log webhook attempt details before sending
    const { data: logData, error: logError } = await supabaseAdmin.rpc('log_webhook_attempt', {
      p_user_id: uid,
      p_email: email,
      p_payload: { uid, email, created_at },
      p_status: 0, // Will be updated after sending
      p_response: { status: "pending" }
    });

    // Get webhook URL
    const zapierWebhookUrl = "https://hooks.zapier.com/hooks/catch/2648556/2plv5iy/";
    
    // Send data to Zapier
    const zapierResponse = await fetch(zapierWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, email, created_at }),
    });
    
    const zapierResponseData = await zapierResponse.text();
    
    // Log webhook response
    await supabaseAdmin.rpc('update_webhook_log', {
      p_log_id: logData,
      p_status: zapierResponse.status,
      p_response: { 
        status: zapierResponse.status, 
        body: zapierResponseData,
        headers: Object.fromEntries(zapierResponse.headers.entries())
      }
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        status: zapierResponse.status,
        response: zapierResponseData,
        logId: logData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error testing webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
