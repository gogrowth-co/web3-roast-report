
import React from 'react';
import { CheckCircle, ArrowUpRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import SEO from '@/components/SEO';

// A buyer here just paid to find out what's broken -- the natural next
// question is who fixes it. Nothing on this site pointed to the Growth
// Audit before this; this is the single highest-intent moment in the whole
// funnel to make that offer, so it gets a dedicated section, not a banner.
const GROWTH_AUDIT_URL =
  "https://mangabeira.net/services/web3-growth-audit?utm_source=web3roast&utm_medium=post_purchase&utm_campaign=roast_to_audit_bridge";

const OrderComplete = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  // Public page: buyers without an account land here too (gtm-roast-20).
  // The GA4 purchase is sent server-side by stripe-webhook, so nothing on
  // this page has to fire for the sale to be tracked.

  return (
    <div className="min-h-screen bg-web3-dark">
      <SEO 
        title="Order Complete - Web3 ROAST Pro Upgrade"
        description="Thank you for upgrading to Web3 ROAST Pro! Your video review will be delivered within 48 hours."
      />
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
        <div className="relative mb-8">
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
              {session?.user?.email
                ? `We'll email you at ${session.user.email} when your pro review is ready.`
                : "We'll email you at the address you used at checkout when your pro review is ready."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-web3-purple/30 bg-web3-gray p-6 mb-8 max-w-2xl w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-web3-purple/20 p-2 rounded-full shrink-0">
              <Compass className="h-5 w-5 text-web3-purple" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-web3-purple font-semibold mb-1">
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
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-web3-purple/40 px-4 py-2.5 text-sm font-medium text-web3-purple hover:bg-web3-purple/10 transition-colors whitespace-nowrap"
          >
            See the Growth Audit
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="border-zinc-700" onClick={() => navigate('/')}>
            Return to Home
          </Button>
          {session && (
            <Button onClick={() => navigate('/dashboard')}>
              View My Roasts
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderComplete;
