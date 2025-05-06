
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

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
    console.log("create-share function called");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get request payload
    const { roastId } = await req.json();
    console.log("Request payload:", { roastId });

    if (!roastId) {
      console.error("Missing roastId in request");
      return new Response(
        JSON.stringify({ error: "roastId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if roast exists
    const { data: roast, error: roastError } = await supabaseClient
      .from("roasts")
      .select("id")
      .eq("id", roastId)
      .single();

    if (roastError || !roast) {
      console.error("Roast fetch error:", roastError);
      return new Response(
        JSON.stringify({ error: "Roast not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if share already exists
    const { data: existingShare, error: queryError } = await supabaseClient
      .from("shared_roasts")
      .select("share_id")
      .eq("roast_id", roastId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      console.error("Error checking for existing share:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to check for existing shares" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If share exists, return existing share id
    if (existingShare) {
      console.log("Returning existing share:", existingShare.share_id);
      return new Response(
        JSON.stringify({ shareId: existingShare.share_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a short unique ID
    const shareId = nanoid(10);
    console.log("Generated new shareId:", shareId);

    // Save the share link
    const { error: insertError } = await supabaseClient
      .from("shared_roasts")
      .insert({
        roast_id: roastId,
        share_id: shareId,
      });

    if (insertError) {
      console.error("Share creation error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create share link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Share created successfully with shareId:", shareId);
    return new Response(
      JSON.stringify({ shareId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in create-share function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
