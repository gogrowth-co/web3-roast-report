
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { FROM, REPLY_TO } from "../_shared/email.ts";
import { isRoastSale, parseProductIds } from "./roast-sale.ts";

// Deno only has async Web Crypto, so signatures must be checked with
// constructEventAsync and this provider. The sync constructEvent throws on
// every request ("SubtleCryptoProvider cannot be used in a synchronous
// context"), which rejected every Stripe event with a 400 (gtm-roast-19).
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Account has exactly one OpenAI Ads pixel (confirmed via the live
// mangabeira.net GTM container) -- not a secret, it's already public in
// every page that loads the oaiq snippet.
const CHATGPT_ADS_PIXEL_ID = "5VyEFmoMWcYdYkCjg6DrYR";

// Gabriel's own inbox, by his decision (2026-10-02), until a mangabeira.net
// mailbox exists. Shared with the buyer email's reply-to.
const FULFILLMENT_INBOX = REPLY_TO;

/**
 * Fire-and-forget: a failed alert must never fail the webhook itself (Stripe
 * retries on non-2xx, and purchase processing must not hinge on Resend being
 * up or configured). Nothing here runs at module scope, so a missing or invalid Resend key can
 * never crash the function before `serve` runs.
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
    // Raw fetch, not the SDK, so the alert carries an Idempotency-Key keyed
    // to the checkout session: a repeated Stripe delivery (including Roast
    // payment-link sales, which have no purchases row to dedupe on) does not
    // email Gabriel twice. Resend dedupes the key for 24h.
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `fulfillment-alert:${details.sessionId}`,
      },
      body: JSON.stringify({
      from: FROM,
      to: [FULFILLMENT_INBOX],
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
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("Resend rejected the fulfillment alert (non-fatal):", await res.text());
    }
  } catch (error) {
    console.error("Failed to send fulfillment alert (non-fatal):", error);
  }
}

/**
 * Customer-facing counterpart to sendFulfillmentAlert above -- that one
 * tells Gabriel a sale happened, this tells the buyer their order was
 * received. Distinct from gtm-roast-02; OrderComplete.tsx already promises
 * "we'll email you when your pro review is ready" but nothing ever sent
 * that email. Same fire-and-forget contract: a failed send must never fail
 * the webhook or block granting Pro access.
 *
 * reply_to is Gabriel's own inbox (REPLY_TO), so a buyer reply always lands
 * somewhere he reads.
 *
 * Stripe retries checkout.session.completed on any non-2xx response, and a
 * duplicate DB write below would otherwise mean a duplicate email too --
 * an idempotency key keyed to the checkout session (Resend dedupes for 24h)
 * makes retries safe without needing our own send-log table. Called via
 * raw fetch, not the SDK, since v2's emails.send() has no documented way
 * to set this header.
 */
async function sendBuyerConfirmationEmail(details: {
  buyerEmail: string | null;
  roastUrl: string | null;
  sessionId: string;
}) {
  if (!details.buyerEmail) {
    console.error("Buyer confirmation skipped: no buyer email on the session");
    return;
  }
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("Buyer confirmation skipped: RESEND_API_KEY not set");
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `buyer-confirmation:${details.sessionId}`,
      },
      body: JSON.stringify({
      from: FROM,
      to: [details.buyerEmail],
      reply_to: REPLY_TO,
      subject: "Your Pro Roast is confirmed 🔥",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">We got your Pro Roast order</h1>
          <p style="font-size: 16px; color: #555;">
            Your expert video review${details.roastUrl ? ` for <strong>${details.roastUrl}</strong>` : ""}
            is in the queue. You'll have it in your inbox within 48 hours.
          </p>
          <ul style="font-size: 16px; color: #555;">
            <li><strong>Expert Video Review</strong> — a real walkthrough with actionable fixes, not another auto-generated score.</li>
            <li><strong>Priority Analysis</strong> — your project goes straight to the front of the queue.</li>
            <li><strong>Follow-up Support</strong> — one follow-up question after delivery, on us.</li>
          </ul>
          <p style="font-size: 14px; color: #888;">
            Questions in the meantime? Just reply to this email.
          </p>
        </div>
      `,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("Resend rejected the buyer confirmation (non-fatal):", await res.text());
    }
  } catch (error) {
    console.error("Failed to send buyer confirmation (non-fatal):", error);
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

// Server-side GA4 purchase (Measurement Protocol). The browser event on
// /order-complete only fired if the buyer stayed logged in on that page and
// the webhook beat a 10s poll; anonymous buyers could never fire it. Sent to
// both GA4 destinations the site reports to (Roast's own property and
// mangabeira.net's stream). Each needs its own Measurement Protocol secret;
// a destination without one is skipped. Fire-and-forget, like the others.
const GA4_DESTINATIONS: [string, string][] = [
  ['G-DDHR0VPSE4', 'GA4_MP_SECRET_ROAST'],
  ['G-77SVSK807V', 'GA4_MP_SECRET_MANGABEIRA'],
];

async function sendGa4Purchase(params: {
  clientId: string | null;
  transactionId: string;
  value: number; // decimal currency units (49.00), not cents
  currency: string;
  pageLocation: string;
}) {
  const clientId = params.clientId || `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
  const body = JSON.stringify({
    client_id: clientId,
    events: [{
      name: 'purchase',
      params: {
        transaction_id: params.transactionId,
        value: params.value,
        currency: params.currency.toUpperCase(),
        items: [{ item_id: 'pro-roast', item_name: 'Pro Roast', price: params.value, quantity: 1 }],
        page_location: params.pageLocation,
        engagement_time_msec: 1,
      },
    }],
  });
  await Promise.all(GA4_DESTINATIONS.map(async ([measurementId, secretName]) => {
    const secret = Deno.env.get(secretName);
    if (!secret) {
      console.error(`GA4 purchase skipped for ${measurementId}: ${secretName} not set`);
      return;
    }
    try {
      const res = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${encodeURIComponent(secret)}`,
        { method: 'POST', body, signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) console.error(`GA4 purchase rejected for ${measurementId} (non-fatal): HTTP ${res.status}`);
    } catch (error) {
      console.error(`GA4 purchase failed for ${measurementId} (non-fatal):`, error);
    }
  }));
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
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verify and construct the event
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Missing Stripe webhook secret');
    }
    
    // Verify the webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        stripeSignature,
        webhookSecret,
        undefined,
        cryptoProvider,
      );
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

    console.log(`Signature verified: ${event.id} ${event.type}`);

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;

      // Shared Stripe account: only act on Roast sales (see roast-sale.ts).
      // Stripe API errors here throw to the outer catch and return 500, so
      // Stripe retries instead of a real sale being dropped.
      const sessionMetadata = session.metadata as Record<string, string> | null;
      let lineItemProductIds: string[] = [];
      const roastProductIds = new Set(parseProductIds(Deno.env.get('ROAST_PRODUCT_IDS')));
      if (!sessionMetadata?.roastId) {
        const roastPriceId = Deno.env.get('STRIPE_PRICE_ID');
        if (roastPriceId) {
          const roastPrice = await stripe.prices.retrieve(roastPriceId);
          roastProductIds.add(typeof roastPrice.product === 'string' ? roastPrice.product : roastPrice.product.id);
        } else {
          console.error('STRIPE_PRICE_ID not set: only roastId-tagged checkouts can be matched');
        }
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 20 });
        type LineItem = { price?: { product?: string | { id: string } | null } | null };
        lineItemProductIds = (lineItems.data as LineItem[])
          .map((item) => item.price?.product)
          .filter((p): p is string | { id: string } => !!p)
          .map((p) => (typeof p === 'string' ? p : p.id));
      }
      if (!isRoastSale({ metadata: sessionMetadata, lineItemProductIds, roastProductIds })) {
        console.log(`Ignored ${event.id}: checkout ${sessionId} is not a Roast sale`);
        return new Response(JSON.stringify({ received: true, ignored: 'not a Roast sale' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Retries are safe without our own send log: the alert and the buyer
      // email carry a Resend Idempotency-Key per session and the ads
      // conversion dedupes on eventId, so a repeated delivery re-sends
      // nothing that already went out and retries anything that failed.

      // Fulfillment alert fires FIRST, before any DB writes below, and is
      // never gated on their success. Stripe's signature check above already
      // proves the charge is real -- everything after this point is our own
      // bookkeeping, and a bookkeeping failure is exactly the case where
      // Gabriel most needs to hear that a sale happened, not the case where
      // the alert should silently get skipped.
      const metadata = sessionMetadata;
      // Payment-link checkouts often leave customer_email empty and put the
      // address in customer_details instead.
      const buyerEmail: string | null = session.customer_email ?? session.customer_details?.email ?? null;
      const roastId = metadata?.roastId ?? null;
      // Set at checkout-creation time from the request's own origin -- a
      // purchase started on roast.mangabeira.net must report that URL, not
      // a hardcoded old domain, or the conversion's source-domain data
      // misattributes every subdomain-bridge sale. Old sessions predating
      // this field fall back to the canonical domain.
      const checkoutOrigin = metadata?.origin || 'https://roast.mangabeira.net';
      let roastUrl: string | null = null;
      if (roastId) {
        const { data: roastRow } = await supabase
          .from('roasts')
          .select('url')
          .eq('id', roastId)
          .maybeSingle();
        roastUrl = roastRow?.url ?? null;
        if (!roastUrl) {
          // Bought without an account: the roast is still anonymous.
          const { data: anonRow } = await supabase
            .from('anonymous_roasts')
            .select('url')
            .eq('id', roastId)
            .maybeSingle();
          roastUrl = anonRow?.url ?? null;
        }
      }

      // Real purchase signal for the ChatGPT Ads campaigns -- checkout_started
      // fires at create-checkout time; order_created is the matching event for
      // an actually completed sale. sourceUrl must be where the PURCHASE
      // happened, not `roastUrl` (the customer's own audited site).
      const notifications = Promise.all([
        sendFulfillmentAlert({
          buyerEmail,
          amount: session.amount_total ?? null,
          currency: session.currency ?? null,
          sessionId,
          roastId,
          roastUrl,
        }),
        sendBuyerConfirmationEmail({ buyerEmail, roastUrl, sessionId }),
        sendConversionEvent({
          type: 'order_created',
          amount: session.amount_total ?? 0, // Stripe's amount_total is already in cents
          currency: session.currency ?? 'usd',
          sourceUrl: `${checkoutOrigin}/order-complete?session_id=${sessionId}`,
          eventId: `${sessionId}:order_created`,
          email: buyerEmail,
          oppref: metadata?.oppref || null,
        }),
        sendGa4Purchase({
          clientId: metadata?.ga_cid || null,
          transactionId: sessionId,
          value: (session.amount_total ?? 0) / 100,
          currency: session.currency ?? 'usd',
          pageLocation: `${checkoutOrigin}/order-complete`,
        }),
      ]);
      // Started before the DB writes (so a bookkeeping failure never skips
      // them) but not awaited on the response path: each helper already
      // swallows its own errors, and slow email/ads/GA4 calls must not push
      // the reply past Stripe's timeout. waitUntil keeps the worker alive
      // until they finish.
      // deno-lint-ignore no-explicit-any
      const edgeRuntime = (globalThis as any).EdgeRuntime;
      if (edgeRuntime?.waitUntil) {
        edgeRuntime.waitUntil(notifications);
      } else {
        await notifications;
      }

      // Update the purchase record
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .update({ status: 'complete', ...(buyerEmail ? { email: buyerEmail } : {}) })
        .eq('session_id', sessionId)
        .select('user_id');

      if (purchaseError) {
        console.error('Error updating purchase record:', purchaseError);
        return new Response(`Error updating purchase: ${purchaseError.message}`, { status: 500 });
      }

      // Anonymous purchases have no user to flag Pro (user_id is null).
      const userId = purchaseData?.[0]?.user_id ?? null;
      if (userId) {

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
