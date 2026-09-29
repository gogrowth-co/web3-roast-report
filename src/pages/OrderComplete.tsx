
import React, { useEffect } from 'react';
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from '@/utils/analytics';
import SEO from '@/components/SEO';

const OrderComplete = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  // Fire the GA4 purchase event exactly once, reading the real amount back
  // from our own purchases row rather than trusting anything client-side --
  // create-checkout writes that row from session.amount_total (Stripe's own
  // figure) before ever redirecting here. Previously this page had no
  // tracking at all. transaction_id gives GA4 its own dedup on refresh, so
  // no extra guard is needed for that case.
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;

    supabase
      .from('purchases')
      .select('amount')
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load purchase for tracking:', error);
          return;
        }
        if (data?.amount != null) {
          trackPurchase(sessionId, data.amount);
        }
      });
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
