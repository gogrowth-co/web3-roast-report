import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { escapeHtml, leadEmail, REPLY_TO, sendEmail, SITE } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// One roast can be unlocked by a few addresses (a team), not a mailing list.
const MAX_LEADS_PER_ROAST = 5;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * An anonymous visitor trades an email for the full report (gtm-roast-20).
 * Ownership is checked the same way get-anonymous-roast does it: the
 * session_id stored on the row must match. Returns a lead token that unlocks
 * the report on any device, and emails the report plus the Pro Roast offer.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const roastId = body?.roastId;
    const sessionId = body?.sessionId;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (typeof roastId !== "string" || !UUID_REGEX.test(roastId) || typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 200) {
      return json({ error: "Invalid request" }, 400);
    }
    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return json({ error: "Please enter a valid email address" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: roast } = await supabase
      .from("anonymous_roasts")
      .select("id, session_id, url, status, ai_analysis")
      .eq("id", roastId)
      .maybeSingle();
    if (!roast || roast.session_id !== sessionId) return json({ error: "Roast not found" }, 404);
    if (roast.status !== "completed") return json({ error: "Your roast is still being analyzed. Try again in a moment." }, 409);

    // Same email again (double click, second visit): reuse the lead, resend
    // nothing new beyond what the idempotency key already allows.
    const { data: existing } = await supabase
      .from("roast_leads")
      .select("token")
      .eq("anonymous_roast_id", roastId)
      .eq("email", email)
      .maybeSingle();

    let token = existing?.token as string | undefined;
    const isNewLead = !token;
    if (!token) {
      const { count } = await supabase
        .from("roast_leads")
        .select("id", { count: "exact", head: true })
        .eq("anonymous_roast_id", roastId);
      if ((count ?? 0) >= MAX_LEADS_PER_ROAST) return json({ error: "This report has already been sent to several addresses." }, 429);

      token = randomToken();
      const { error: insertError } = await supabase
        .from("roast_leads")
        .insert({ anonymous_roast_id: roastId, url: roast.url, email, token });
      if (insertError) {
        console.error("Failed to save lead:", insertError);
        return json({ error: "Could not save your email. Please try again." }, 500);
      }
    }

    const reportLink = `${SITE}/results/${roastId}?k=${token}`;
    const offerLink = `${reportLink}&offer=1`;

    // Email failures never block the unlock: the visitor already sees the
    // full report on the page.
    try {
      const analysis = typeof roast.ai_analysis === "string" ? JSON.parse(roast.ai_analysis) : roast.ai_analysis;
      const mail = leadEmail({ url: roast.url, analysis, reportLink, offerLink });
      await sendEmail({ to: email, ...mail, idempotencyKey: `lead-email:${roastId}:${email}` });
    } catch (mailError) {
      console.error("Lead email failed (non-fatal):", mailError);
    }

    if (isNewLead) {
      const safeUrl = escapeHtml(String(roast.url));
      await sendEmail({
        to: REPLY_TO,
        subject: `New Web3 Roast lead: ${String(roast.url).slice(0, 80)}`,
        html: `<p>New lead from the free roast.</p><ul><li><strong>Email:</strong> ${escapeHtml(email)}</li><li><strong>Project:</strong> ${safeUrl}</li><li><strong>Report:</strong> <a href="${reportLink}">${reportLink}</a></li></ul>`,
        text: `New lead from the free roast.\nEmail: ${email}\nProject: ${roast.url}\nReport: ${reportLink}`,
        idempotencyKey: `lead-alert:${roastId}:${email}`,
      });
    }

    return json({ success: true, token });
  } catch (error) {
    console.error("Error in capture-lead:", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
