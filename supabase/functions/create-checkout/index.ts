
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

// Fire-and-forget, same pattern as the fulfillment alert: a rejected or
// unreachable Conversions API call must never fail checkout creation.
async function sendConversionEvent(params: {
  type: string;
  amount: number; // dollars, not cents
  currency: string;
  sourceUrl: string;
  eventId: string;
}) {
  try {
    const capiKey = Deno.env.get('CHATGPT_ADS_CONVERSION_KEY');
    if (!capiKey) {
      console.error('Conversion event skipped: CHATGPT_ADS_CONVERSION_KEY not set');
      return;
    }
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
          data: { type: 'contents', amount: params.amount, currency: params.currency.toUpperCase() },
        }],
      }),
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
    const { roastId } = requestData;

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
      metadata: { roastId },
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
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency ?? 'usd',
      sourceUrl: `${req.headers.get('origin')}/results/${roastId}`,
      eventId: `${session.id}:checkout_started`,
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
