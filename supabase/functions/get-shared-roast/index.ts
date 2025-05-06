
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("get-shared-roast function called");
    
    // Get shareId from request body
    const { shareId } = await req.json();
    console.log("Request payload:", { shareId });

    if (!shareId) {
      console.error("Missing shareId in request");
      return new Response(
        JSON.stringify({ error: "shareId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        },
      }
    );

    // Get the shared roast record
    const { data: sharedRoast, error: sharedRoastError } = await supabaseClient
      .from("shared_roasts")
      .select("roast_id")
      .eq("share_id", shareId)
      .single();

    if (sharedRoastError || !sharedRoast) {
      console.error("Shared roast fetch error:", sharedRoastError);
      return new Response(
        JSON.stringify({ error: "Shared roast not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found shared roast with roast_id:", sharedRoast.roast_id);

    // Get the roast data
    const { data: roast, error: roastError } = await supabaseClient
      .from("roasts")
      .select("*")
      .eq("id", sharedRoast.roast_id)
      .single();

    if (roastError || !roast) {
      console.error("Roast fetch error:", roastError);
      return new Response(
        JSON.stringify({ error: "Roast not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully retrieved roast data");
    return new Response(
      JSON.stringify({ roast }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in get-shared-roast:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
