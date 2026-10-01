
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { Resend } from "npm:resend@2.0.0";

// Account has exactly one OpenAI Ads pixel (confirmed via the live
// mangabeira.net GTM container) -- not a secret, it's already public in
// every page that loads the oaiq snippet.
const CHATGPT_ADS_PIXEL_ID = "5VyEFmoMWcYdYkCjg6DrYR";

const FULFILLMENT_INBOX = "contact@web3roast.com";
// contact@web3roast.com's access is uncertain right now (Gabriel, 2026-09-29)
// -- cc'd directly so the alert isn't relying on an inbox that might not be
// checked. Remove once gtm-roast-11 (setting up contact@web3roast.com
// properly) is done and that inbox is confirmed reliable on its own.
const FULFILLMENT_CC = "gmangabeira@gmail.com";

/**
 * Fire-and-forget: a failed alert must never fail the webhook itself (Stripe
 * retries on non-2xx, and purchase processing must not hinge on Resend being
 * up or configured). The Resend client is constructed IN HERE, not at module
 * scope — its constructor can throw on a missing/invalid key, and at module
 * scope that would crash the whole function before `serve` ever runs, taking
 * down real payment processing over an optional notification.
 */
async function sendFulfillmentAlert(details: {
  buyerEmail: string | null;
  amount: number | null;
  currency: string | null;
  sessionId: string;
  roastId: string | null;
  roastUrl: string | null;
}) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("Fulfillment alert skipped: RESEND_API_KEY not set");
      return;
    }
    const resend = new Resend(resendApiKey);

    // The SDK resolves with { data: null, error } on failure (bad key,
    // unverified sender, rate limit) rather than throwing -- so a thrown
    // exception alone won't catch every failure mode. Check both.
    const { error } = await resend.emails.send({
      from: "Web3ROAST <contact@email.web3roast.com>",
      to: [FULFILLMENT_INBOX],
      cc: [FULFILLMENT_CC],
      subject: `New Pro Roast sale${details.roastUrl ? ` — ${details.roastUrl}` : ""}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">A Pro Roast just sold 🔥</h1>
          <p style="font-size: 16px; color: #555;">Video due within 48 hours.</p>
          <ul style="font-size: 16px; color: #555;">
            <li><strong>Buyer:</strong> ${details.buyerEmail ?? "unknown"}</li>
            <li><strong>Amount:</strong> ${
              details.amount != null && details.currency
                ? `${(details.amount / 100).toFixed(2)} ${details.currency.toUpperCase()}`
                : "unknown"
            }</li>
            <li><strong>Project URL:</strong> ${details.roastUrl ?? "unknown — roastId " + (details.roastId ?? "missing") + ", check the roasts table"}</li>
            <li><strong>Stripe session:</strong> ${details.sessionId}</li>
          </ul>
        </div>
      `,
    });

    if (error) {
      console.error("Resend rejected the fulfillment alert (non-fatal):", error);
    }
  } catch (error) {
    console.error("Failed to send fulfillment alert (non-fatal):", error);
  }
}

// Per https://developers.openai.com/ads/conversions-api: match identifiers
// must be SHA-256, lowercase 64-char hex, of the UTF-8-normalized value.
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Fire-and-forget, same pattern as the fulfillment alert: a rejected or
// unreachable Conversions API call must never fail webhook processing --
// Stripe retries the whole webhook on any non-2xx. Capped with an abort
// timeout so a stalled endpoint can't delay granting Pro access or block
// OrderComplete.tsx's short purchase-confirmation polling window.
async function sendConversionEvent(params: {
  type: string;
  amount: number; // integer, currency's minor unit (cents for USD), NOT decimal dollars
  currency: string;
  sourceUrl: string;
  eventId: string;
  email?: string | null;
  oppref?: string | null;
}) {
  try {
    const capiKey = Deno.env.get('CHATGPT_ADS_CONVERSION_KEY');
    if (!capiKey) {
      console.error('Conversion event skipped: CHATGPT_ADS_CONVERSION_KEY not set');
      return;
    }
    // oppref (OpenAI's own click-attribution id) is passed straight through
    // when the browser captured one at landing (see analytics.ts); the user
    // object below (hashed email) is the fallback match-rate signal either way.
    const user: Record<string, unknown> = {};
    if (params.email) user.emails_sha256 = [await sha256Hex(params.email)];

    const res = await fetch(`https://bzr.openai.com/v1/events?pid=${CHATGPT_ADS_PIXEL_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${capiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        validate_only: false,
        integration_source: 'web3-roast-server',
        events: [{
          id: params.eventId,
          type: params.type,
          timestamp_ms: Date.now(),
          action_source: 'web',
          source_url: params.sourceUrl,
          ...(params.oppref ? { oppref: params.oppref } : {}),
          ...(Object.keys(user).length > 0 ? { user } : {}),
          data: { type: 'contents', amount: params.amount, currency: params.currency.toUpperCase() },
        }],
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.error(`Conversion event rejected (non-fatal): HTTP ${res.status}`, await res.text());
    }
  } catch (error) {
    console.error('Failed to send conversion event (non-fatal):', error);
  }
}

serve(async (req) => {
  try {
    const stripeSignature = req.headers.get('stripe-signature');
    if (!stripeSignature) {
      return new Response('Missing stripe signature', { status: 400 });
    }

    // Read the request body as text
    const body = await req.text();
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Verify and construct the event
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Missing Stripe webhook secret');
    }
    
    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, stripeSignature, webhookSecret);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Webhook signature verification failed: ${errorMsg}`);
      return new Response(`Webhook signature verification failed: ${errorMsg}`, { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;

      // Fulfillment alert fires FIRST, before any DB writes below, and is
      // never gated on their success. Stripe's signature check above already
      // proves the charge is real -- everything after this point is our own
      // bookkeeping, and a bookkeeping failure is exactly the case where
      // Gabriel most needs to hear that a sale happened, not the case where
      // the alert should silently get skipped.
      const metadata = session.metadata as Record<string, string> | null;
      const roastId = metadata?.roastId ?? null;
      // Set at checkout-creation time from the request's own origin -- a
      // purchase started on roast.mangabeira.net must report that URL, not
      // a hardcoded web3roast.com, or the conversion's source-domain data
      // misattributes every subdomain-bridge sale. Old sessions predating
      // this field fall back to the canonical domain.
      const checkoutOrigin = metadata?.origin || 'https://web3roast.com';
      let roastUrl: string | null = null;
      if (roastId) {
        const { data: roastRow } = await supabase
          .from('roasts')
          .select('url')
          .eq('id', roastId)
          .maybeSingle();
        roastUrl = roastRow?.url ?? null;
      }

      await sendFulfillmentAlert({
        buyerEmail: session.customer_email ?? null,
        amount: session.amount_total ?? null,
        currency: session.currency ?? null,
        sessionId,
        roastId,
        roastUrl,
      });

      // Real purchase signal for the ChatGPT Ads campaigns -- checkout_started
      // fires at create-checkout time; this is the matching order_created for
      // an actually completed sale, same account pixel and event type Growth
      // Audit's own checkout campaign already optimizes toward.
      // sourceUrl must be where the PURCHASE happened, not `roastUrl` (the
      // customer's own submitted site being audited -- using that would
      // misattribute the sale to an unrelated third-party domain).
      await sendConversionEvent({
        type: 'order_created',
        amount: session.amount_total ?? 0, // Stripe's amount_total is already in cents
        currency: session.currency ?? 'usd',
        sourceUrl: `${checkoutOrigin}/order-complete?session_id=${sessionId}`,
        eventId: `${sessionId}:order_created`,
        email: session.customer_email,
        oppref: metadata?.oppref || null,
      });

      // Update the purchase record
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .update({ status: 'complete' })
        .eq('session_id', sessionId)
        .select('user_id');

      if (purchaseError) {
        console.error('Error updating purchase record:', purchaseError);
        return new Response(`Error updating purchase: ${purchaseError.message}`, { status: 500 });
      }

      if (purchaseData && purchaseData.length > 0) {
        const userId = purchaseData[0].user_id;

        // Update the user's is_pro status
        const { error: userUpdateError } = await supabase.auth.admin.updateUserById(
          userId,
          { user_metadata: { is_pro: true } }
        );

        if (userUpdateError) {
          console.error('Error updating user status:', userUpdateError);
          return new Response(`Error updating user: ${userUpdateError.message}`, { status: 500 });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    });
  } catch (error) {
    console.error('Error handling webhook:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Webhook error: ${errorMsg}`, { status: 500 });
  }
});
