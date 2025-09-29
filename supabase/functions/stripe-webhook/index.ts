
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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
