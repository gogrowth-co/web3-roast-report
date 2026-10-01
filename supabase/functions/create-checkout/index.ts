
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Account has exactly one OpenAI Ads pixel (confirmed via the live
// mangabeira.net GTM container) -- not a secret, it's already public in
// every page that loads the oaiq snippet.
const CHATGPT_ADS_PIXEL_ID = "5VyEFmoMWcYdYkCjg6DrYR";

// x-forwarded-for can be a comma-separated proxy chain ("client, proxy1,
// proxy2") -- take the client's own address (the first entry) and validate
// it's plausibly an IP before sending it, rather than risk the whole raw
// header string being rejected or silently dropped as a bad match signal.
const IP_RE = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+:[0-9a-fA-F:]*$/;
function firstValidIp(...candidates: (string | null)[]): string | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const first = raw.split(',')[0].trim();
    if (IP_RE.test(first)) return first;
  }
  return null;
}

// Per https://developers.openai.com/ads/conversions-api: match identifiers
// must be SHA-256, lowercase 64-char hex, of the UTF-8-normalized value.
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Fire-and-forget, same pattern as the fulfillment alert: a rejected or
// unreachable Conversions API call must never fail checkout creation. Capped
// with an abort timeout -- without one, an await on a stalled endpoint would
// block returning the Stripe checkout URL to the customer.
async function sendConversionEvent(params: {
  type: string;
  amount: number; // integer, currency's minor unit (cents for USD), NOT decimal dollars
  currency: string;
  sourceUrl: string;
  eventId: string;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  oppref?: string | null;
}) {
  try {
    const capiKey = Deno.env.get('CHATGPT_ADS_CONVERSION_KEY');
    if (!capiKey) {
      console.error('Conversion event skipped: CHATGPT_ADS_CONVERSION_KEY not set');
      return;
    }
    // No oppref (OpenAI's own click-attribution id) is captured on the
    // frontend yet -- these events rely on the user object below for
    // probabilistic match-rate attribution in the meantime. Follow-up:
    // capture oppref on ad landing and thread it through to checkout.
    const user: Record<string, unknown> = {};
    if (params.email) user.emails_sha256 = [await sha256Hex(params.email)];
    if (params.ipAddress) user.ip_address = params.ipAddress;
    if (params.userAgent) user.user_agent = params.userAgent;

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    // Parse request body
    const requestData = await req.json();
    const { roastId, oppref: rawOppref } = requestData;
    // Stripe metadata values are capped at 500 chars -- an oversized or
    // malformed oppref must never be able to break checkout creation itself.
    // OpenAI's own identifiers are short opaque strings; 200 chars is
    // generous headroom while staying well under Stripe's limit.
    const oppref = typeof rawOppref === 'string' && rawOppref.length > 0 && rawOppref.length <= 200
      ? rawOppref
      : null;

    if (!roastId) {
      throw new Error('Missing roast ID');
    }

    // The price is never taken from the client. It used to accept a
    // client-supplied priceId, falling back to a hardcoded price if absent --
    // that fallback (price_1RJbftD41aNWIHmddbD7SvEo) turned out to be a real,
    // active $149 price on the same product as the intended $49 one
    // (price_1RLzE6D41aNWIHmdgGD6v8J2, verified directly against Stripe
    // before this fix). A crafted request with no priceId would have charged
    // $149 instead of $49. The server now reads the one price it will ever
    // charge from its own secret, full stop.
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    if (!priceId) {
      throw new Error('STRIPE_PRICE_ID is not configured');
    }

    // Initialize Stripe with the secret key from environment variables
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get user data from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Error fetching user or user not found');
    }

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      // {CHECKOUT_SESSION_ID} is a literal Stripe template placeholder --
      // Stripe substitutes the real session id before redirecting. Lets
      // OrderComplete.tsx look up which purchase just completed and its
      // real amount, for revenue tracking (gtm-roast-04).
      success_url: `${req.headers.get('origin')}/order-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/results/${roastId}`,
      // Carried through to the webhook via the Stripe event itself, so the
      // fulfillment alert can say which project needs the video without a
      // schema change or an extra purchases<->roasts join.
      // origin lets the webhook build the correct order-complete URL for the
      // conversion event's source_url -- without it, a purchase started on
      // roast.mangabeira.net would get misreported as the old domain.
      // oppref is OpenAI's ad-click attribution id (captured client-side on
      // landing, see analytics.ts) -- stored here so stripe-webhook can
      // forward it with the order_created event too, once the sale is real.
      metadata: { roastId, origin: req.headers.get('origin') ?? '', oppref: oppref ?? '' },
    });

    // Save the checkout session to the purchases table
    const { error: insertError } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        session_id: session.id,
        price_id: priceId,
        status: 'pending',
        amount: session.amount_total ? session.amount_total / 100 : 0,
      });

    if (insertError) {
      console.error('Error inserting purchase record:', insertError);
    }

    // Real checkout-intent signal for the ChatGPT Ads campaigns pointing at
    // roast.mangabeira.net -- until this existed, those campaigns had zero
    // conversion data from Roast traffic (no OpenAI pixel was ever installed
    // here). Matches the account's existing checkout_started event type, so
    // it feeds straight into the conversion_event_setting_ids campaigns
    // already reference -- no new event or campaign change needed.
    await sendConversionEvent({
      type: 'checkout_started',
      amount: session.amount_total ?? 0, // Stripe's amount_total is already in cents
      currency: session.currency ?? 'usd',
      sourceUrl: `${req.headers.get('origin')}/results/${roastId}`,
      eventId: `${session.id}:checkout_started`,
      email: user.email,
      ipAddress: firstValidIp(req.headers.get('cf-connecting-ip'), req.headers.get('x-forwarded-for')),
      userAgent: req.headers.get('user-agent'),
      oppref,
    });

    // Return the checkout session URL
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500 
      }
    );
  }
});
