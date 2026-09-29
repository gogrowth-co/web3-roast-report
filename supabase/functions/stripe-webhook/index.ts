
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FULFILLMENT_INBOX = "contact@web3roast.com";

/**
 * Fire-and-forget: a failed alert must never fail the webhook itself (Stripe
 * retries on non-2xx, and we don't want purchase processing to hinge on
 * Resend being up). Errors are logged, not thrown.
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
    await resend.emails.send({
      from: "Web3ROAST <contact@email.web3roast.com>",
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
    });
  } catch (error) {
    console.error("Failed to send fulfillment alert (non-fatal):", error);
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

      // Fulfillment alert: sent unconditionally once Stripe confirms the
      // charge, independent of whether the purchases/user-metadata updates
      // above succeeded — a sale that happened but wasn't recorded cleanly
      // is exactly the case where Gabriel most needs to hear about it.
      const roastId = (session.metadata as Record<string, string> | null)?.roastId ?? null;
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
