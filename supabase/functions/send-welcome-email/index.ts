import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendEmail, welcomeEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // The recipient comes from the authenticated user, never the request
    // body, so this can't be used as an open email relay.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData?.user?.email) return json({ error: "Unauthorized" }, 401);

    // One welcome per user: a double-submit or retry can't send it twice.
    const ok = await sendEmail({
      to: userData.user.email,
      ...welcomeEmail(),
      idempotencyKey: `welcome:${userData.user.id}`,
    });
    return json({ success: ok }, 200);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return json({ error: "Unable to send welcome email" }, 500);
  }
});
