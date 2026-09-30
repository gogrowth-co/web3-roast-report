
import React, { useEffect } from 'react';
import { CheckCircle, ArrowUpRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from '@/utils/analytics';
import SEO from '@/components/SEO';

// A buyer here just paid to find out what's broken -- the natural next
// question is who fixes it. Nothing on this site pointed to the Growth
// Audit before this; this is the single highest-intent moment in the whole
// funnel to make that offer, so it gets a dedicated section, not a banner.
const GROWTH_AUDIT_URL =
  "https://mangabeira.net/services/web3-growth-audit?utm_source=web3roast&utm_medium=post_purchase&utm_campaign=roast_to_audit_bridge";

const OrderComplete = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect to login if not authenticated -- but only once useSession has
  // actually finished checking. It starts every mount with session: null
  // while it awaits supabase.auth.getSession(), so redirecting on that
  // initial value alone would send a genuinely logged-in user (arriving
  // straight from Stripe) to /auth before their real session ever loads,
  // unmounting this page and, with it, the purchase-tracking poll below --
  // silently dropping a real conversion. See the pre-push review that
  // caught this on the tracking change.
  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth');
    }
  }, [loading, session, navigate]);

  // Fire the GA4 purchase event once the purchase is server-confirmed paid,
  // reading the real amount back from our own purchases row rather than
  // trusting anything client-side -- create-checkout writes that row from
  // session.amount_total (Stripe's own figure) before ever redirecting here.
  // Previously this page had no tracking at all.
  //
  // status alone isn't enough to fire on: create-checkout inserts the row
  // with status 'pending' *before* payment, so a user who opens this URL for
  // an abandoned or still-processing checkout would otherwise register as
  // revenue. Only stripe-webhook flips it to 'complete', on
  // checkout.session.completed -- and that webhook is asynchronous, so it
  // may not have landed yet by the time this page loads. Poll briefly for
  // 'complete' rather than checking once; give up silently after a few
  // tries rather than firing on an unconfirmed row. transaction_id gives
  // GA4 its own dedup, so re-running this on a refresh is harmless.
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;

    let cancelled = false;
    const maxAttempts = 5;
    const delayMs = 2000;

    const checkOnce = async (attempt: number) => {
      const { data, error } = await supabase
        .from('purchases')
        .select('amount, status')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load purchase for tracking:', error);
        return;
      }

      if (data?.status === 'complete' && data.amount != null) {
        trackPurchase(sessionId, data.amount);
        return;
      }

      if (attempt < maxAttempts) {
        setTimeout(() => checkOnce(attempt + 1), delayMs);
      } else {
        console.warn('Purchase not confirmed complete after polling; not tracking:', sessionId);
      }
    };

    checkOnce(1);
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <SEO 
        title="Order Complete - Web3 ROAST Pro Upgrade"
        description="Thank you for upgrading to Web3 ROAST Pro! Your video review will be delivered within 48 hours."
      />
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-green-500 blur-lg opacity-20"></div>
          <CheckCircle className="h-16 w-16 text-green-500 relative z-10" />
        </div>
        
        <h1 className="text-4xl font-bold mb-6 text-center">Thank You for Upgrading to Web3 ROAST Pro!</h1>
        
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl mb-8 max-w-2xl w-full">
          <h2 className="text-2xl font-semibold mb-4">What happens next?</h2>
          
          <p className="text-gray-300 mb-6">
            Your video review will be delivered within 48 hours. Our expert team will conduct an in-depth analysis of your Web3 project and provide personalized feedback.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="bg-green-500/20 p-1 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Expert Video Review</h3>
                <p className="text-gray-400 text-sm">Detailed walkthrough with actionable insights</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-green-500/20 p-1 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Priority Analysis</h3>
                <p className="text-gray-400 text-sm">Your project is now in our priority queue</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-green-500/20 p-1 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Follow-up Support</h3>
                <p className="text-gray-400 text-sm">Access to one follow-up question after delivery</p>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-800 p-4 rounded-lg">
            <p className="text-center text-amber-300">
              We'll email you at {session?.user?.email} when your pro review is ready.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 to-sky-900/10 p-6 mb-8 max-w-2xl w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-sky-500/20 p-2 rounded-full shrink-0">
              <Compass className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-400 font-semibold mb-1">
                Next step
              </p>
              <p className="text-white font-semibold">
                You just paid to find out what's broken. Ready for someone to fix it?
              </p>
              <p className="text-gray-400 text-sm mt-1">
                The Web3 Growth Audit is a human-led deep dive: on-chain data, community
                health, and a prioritized action plan to execute, not just diagnose.
              </p>
            </div>
          </div>
          <a
            href={GROWTH_AUDIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-sky-500/40 px-4 py-2.5 text-sm font-medium text-sky-300 hover:bg-sky-500/10 transition-colors whitespace-nowrap"
          >
            See the Growth Audit
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="border-zinc-700" onClick={() => navigate('/')}>
            Return to Home
          </Button>
          <Button onClick={() => navigate('/results')}>
            View My Roasts
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderComplete;
