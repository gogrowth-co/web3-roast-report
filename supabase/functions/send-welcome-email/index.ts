import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Web3ROAST <contact@email.web3roast.com>",
      to: [email],
      subject: "Welcome to Web3 ROAST! 🔥",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Web3 ROAST! 🔥</h1>
          <p style="font-size: 16px; color: #555;">
            ${name ? `Hi ${name},` : 'Hi there,'}
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
            <a href="https://qdttapddgbzmmxhbmbfl.supabase.co" 
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
