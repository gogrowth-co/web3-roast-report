import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  name?: string;
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require a valid auth token; the recipient email is taken from the
    // authenticated user, NOT from the request body. This prevents anyone
    // from using this function as an open email relay.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = userData.user.email;
    const body = (await req.json().catch(() => ({}))) as WelcomeEmailRequest;
    const rawName = typeof body?.name === "string" ? body.name.slice(0, 100) : "";
    const safeName = rawName ? escapeHtml(rawName) : "";

    console.log("Sending welcome email to authenticated user");

    const emailResponse = await resend.emails.send({
      from: "Web3ROAST <contact@email.web3roast.com>",
      to: [email],
      reply_to: ["contact@web3roast.com"],
      bcc: ["contact@web3roast.com"],
      subject: "Welcome to Web3 ROAST! 🔥",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Web3 ROAST! 🔥</h1>
          <p style="font-size: 16px; color: #555;">
            ${safeName ? `Hi ${safeName},` : 'Hi there,'}
          </p>
          <p style="font-size: 16px; color: #555;">
            Thanks for signing up! We're excited to help you analyze and improve your Web3 projects with our AI-powered roasting service.
          </p>
          <p style="font-size: 16px; color: #555;">
            Here's what you can do now:
          </p>
          <ul style="font-size: 16px; color: #555;">
            <li>Submit your website URL for a comprehensive analysis</li>
            <li>Get detailed feedback across multiple categories</li>
            <li>Save and track your roasts</li>
            <li>Upgrade to Pro for unlimited roasts and priority support</li>
          </ul>
          <p style="font-size: 16px; color: #555;">
            Ready to get started? Head over to your dashboard and submit your first URL!
          </p>
          <div style="margin: 30px 0;">
            <a href="https://web3roast.com"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 12px 24px;
                      text-decoration: none;
                      border-radius: 6px;
                      display: inline-block;">
              Start Roasting 🔥
            </a>
          </div>
          <p style="font-size: 14px; color: #888; margin-top: 30px;">
            Questions? Just reply to this email - we're here to help!
          </p>
          <p style="font-size: 14px; color: #888;">
            Best regards,<br>
            The Web3 ROAST Team
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true, id: (emailResponse as any)?.data?.id ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: "Unable to send welcome email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
