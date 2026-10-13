import { useParams, useNavigate } from 'react-router-dom';
import { useRoastStatus } from '@/hooks/useRoastStatus';
import LoadingState from '@/components/results/LoadingState';
import ErrorState from '@/components/results/ErrorState';
import ResultsHeader from '@/components/results/ResultsHeader';
import ScreenshotSection from '@/components/results/ScreenshotSection';
import FeedbackSection from '@/components/results/FeedbackSection';
import ScoreSummary from '@/components/results/ScoreSummary';
import UpgradeBanner from '@/components/results/UpgradeBanner';
import GrowthAuditBridge from '@/components/results/GrowthAuditBridge';
import SignupOverlay from '@/components/results/SignupOverlay';
import ScoreCircle from '@/components/ScoreCircle';
import { useSession } from '@/hooks/useSession';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';
import { getOppref, getGaClientId, trackBeginCheckout, trackGenerateLead } from '@/utils/analytics';
import type { AIAnalysis } from '@/types/analysis';

const Results = () => {
  const { id } = useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [pageTitle, setPageTitle] = useState("Loading Results - Web3 ROAST");
  const [pageDescription, setPageDescription] = useState("Analyzing your Web3 project for UX issues and conversion opportunities.");

  if (!id) {
    return <ErrorState title="Invalid roast ID" />;
  }

  const { data: roast, isLoading, error, retryAnalysis, isRetrying, retryCount, isAnonymous, isUnlocked, leadToken, refetch } = useRoastStatus(id);
  const [unlockedHere, setUnlockedHere] = useState(false);
  // Details stay blurred only for an anonymous visitor who has not given an
  // email for this roast yet (gtm-roast-20).
  const locked = !user && isAnonymous && !isUnlocked && !unlockedHere;

  const handleEmailSubmit = async (email: string): Promise<boolean> => {
    const sessionId = localStorage.getItem('roast_session_id');
    const { data, error: leadError } = await supabase.functions.invoke('capture-lead', {
      body: { roastId: id, sessionId, email },
    });
    if (leadError || !data?.success) {
      let message = 'Could not send the report. Please try again.';
      const context = (leadError as { context?: Response } | null)?.context;
      if (context && typeof context.json === 'function') {
        try { message = (await context.json())?.error || message; } catch { /* keep generic */ }
      }
      toast.error(message);
      return false;
    }
    trackGenerateLead();
    setUnlockedHere(true);
    toast.success('Report unlocked. A copy is on its way to your inbox.');
    refetch();
    return true;
  };

  // ?offer=1 (the "Get the Pro Roast" link in the report email) jumps to the offer.
  useEffect(() => {
    if (roast?.status !== 'completed') return;
    if (new URLSearchParams(window.location.search).get('offer') !== '1') return;
    const target = ['pro-roast-offer', 'pro-roast-offer-mobile']
      .map((elId) => document.getElementById(elId))
      .find((el) => el && el.offsetParent !== null);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [roast?.status]);

  // Remember an anonymous visitor's roast as soon as they see it, so a signup
  // from anywhere (header, login page, Google) claims it and the result email
  // can be sent. Claiming needs the matching session id, so this is safe.
  // Only once the analysis is complete: claiming copies the row, so an
  // unfinished roast would be claimed half-done and never finish.
  useEffect(() => {
    if (isAnonymous && id && roast?.status === 'completed') {
      localStorage.setItem('pending_roast_id', id);
    }
  }, [isAnonymous, id, roast?.status]);

  const handleSignUp = () => {
    // Store roast ID to claim after signup
    localStorage.setItem('pending_roast_id', id);
    
    // Navigate to signup with return URL
    navigate('/auth', { 
      state: { 
        returnTo: `/results/${id}`,
        mode: 'signup' 
      } 
    });
  };

  useEffect(() => {
    if (roast && roast.url) {
      setPageTitle(`Analysis for ${new URL(roast.url).hostname} - Web3 ROAST`);
      setPageDescription(`Web3 ROAST analysis results and improvement recommendations for ${new URL(roast.url).hostname}.`);
    }
  }, [roast]);

  if (isLoading || (roast && roast.status === 'pending')) {
    const getLoadingState = () => {
      if (!roast) return { 
        message: "Initializing analysis...", 
        description: "Getting things ready" 
      };
      
      if (isRetrying) {
        return {
          message: `Retrying analysis (Attempt ${retryCount})...`,
          description: "We're trying again to analyze your project"
        };
      }
      
      return {
        message: "AI is analyzing your project...",
        description: "This usually takes about 30-60 seconds"
      };
    };

    const { message, description } = getLoadingState();
    return (
      <>
        <SEO title={pageTitle} description={pageDescription} />
        <LoadingState message={message} description={description} />
      </>
    );
  }

  if (error) {
    console.error("Error loading roast results:", error);
    return (
      <>
        <SEO 
          title="Error - Web3 ROAST"
          description="We encountered an error while loading your results. Please try again."
        />
        <ErrorState 
          title="Error loading results" 
          description={error.message} 
          showRetryButton={true}
          onRetry={retryAnalysis}
        />
      </>
    );
  }

  if (!roast) {
    return <ErrorState title="Results not found" />;
  }

  if (roast.status === 'failed') {
    return (
      <ErrorState 
        title="Analysis failed" 
        description="We couldn't complete the analysis of your project." 
        showRetryButton={true}
        onRetry={retryAnalysis}
      />
    );
  }

  // No account needed: anonymous visitors buy with the session (or emailed
  // lead token) that owns the roast, and Stripe collects their email.
  const handleUpgradeClick = async () => {
    setIsUpgrading(true);
    trackBeginCheckout();

    try {
      const gaClientId = await getGaClientId();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          roastId: id,
          oppref: getOppref(),
          gaClientId,
          sessionId: localStorage.getItem('roast_session_id'),
          leadToken,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to create checkout session");
      setIsUpgrading(false);
    }
  };

  let analysis: AIAnalysis;
  try {
    if (typeof roast.ai_analysis === 'string') {
      analysis = JSON.parse(roast.ai_analysis);
    } else if (roast.ai_analysis && typeof roast.ai_analysis === 'object') {
      analysis = roast.ai_analysis as unknown as AIAnalysis;
    } else {
      console.error("Invalid analysis data format:", roast.ai_analysis);
      throw new Error('Invalid analysis data');
    }

    if (!analysis || 
        typeof analysis.overallScore !== 'number' || 
        !analysis.categoryScores ||
        !Array.isArray(analysis.feedback)) {
      console.error("Invalid analysis structure:", analysis);
      return <LoadingState message="Processing analysis data..." description="Please wait while we process your results" />;
    }

    const transformedAnalysis = {
      score: analysis.overallScore,
      summary: analysis.feedback
        .filter(f => f.severity === 'high')
        .map(f => f.feedback)
        .join('. ') || 'Web3 project analyzed successfully',
      findings: analysis.feedback.map(f => ({
        category: f.category,
        severity: f.severity,
        feedback: f.feedback
      })),
      categories: analysis.categoryScores,
      rawAnalysis: analysis.rawAnalysis
    };

    analysis = transformedAnalysis as unknown as AIAnalysis;
  } catch (error: any) {
    console.warn("Analysis parse warning or still in progress:", error);
    
    if (roast.status === 'failed') {
      return (
        <ErrorState
          title="Analysis failed"
          description="We couldn't complete the analysis. Please try again."
          showRetryButton={true}
          onRetry={retryAnalysis}
        />
      );
    }
    
    return (
      <LoadingState
        message="Processing analysis data..."
        description="Please wait while we finalize your results."
      />
    );
  }

  // Determine summary for SEO description
  let seoDescription = "Web3 project analysis results and improvement recommendations.";
  if (analysis && analysis.summary) {
    seoDescription = analysis.summary.length > 150 
      ? analysis.summary.substring(0, 147) + "..."
      : analysis.summary;
  }

  return (
    <div className="min-h-screen bg-web3-dark">
      <SEO 
        title={pageTitle}
        description={seoDescription}
      />
      <ResultsHeader isAnonymous={isAnonymous} />

      <div className="max-w-7xl mx-auto px-4 py-8" id="report-root">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Web3 ROAST Results</h1>
          <p className="text-gray-400">Analysis for {roast.url}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-6">
            {/* Overall Performance Score - Mobile */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader className="pb-2 text-center">
                <h2 className="text-xl font-semibold">Overall Performance</h2>
                <p className="text-gray-400">How your Web3 project scores</p>
              </CardHeader>
              <CardContent>
                <ScoreCircle score={analysis.score} id="mobile" />
                <p className="text-base text-gray-200 mt-6">
                  {(() => {
                    const sortedCategories = Object.entries(analysis.categories).sort((a, b) => b[1] - a[1]);
                    const topCategory = sortedCategories[0];
                    const weakestCategory = sortedCategories[sortedCategories.length - 1];
                    let performanceLevel = "needs significant improvement";
                    if (analysis.score >= 80) performanceLevel = "performs strongly";
                    else if (analysis.score >= 60) performanceLevel = "shows promise but needs refinement";
                    else if (analysis.score >= 40) performanceLevel = "needs targeted improvements";
                    return `Your Web3 landing page ${performanceLevel} with an overall score of ${analysis.score}. Your strongest area is ${topCategory?.[0]} where your clear ${topCategory?.[0].toLowerCase()} helps build credibility. However, your ${weakestCategory?.[0]} could be holding you back - consider addressing this first for quick wins. Focus on making your value proposition immediately clear to visitors who may not be familiar with your specific Web3 technology.`;
                  })()}
                </p>
              </CardContent>
            </Card>

            {/* Screenshot Section - Mobile */}
            <ScreenshotSection screenshotUrl={roast.screenshot_url} />
            
            {/* Upgrade CTA - Mobile */}
            <div id="pro-roast-offer-mobile">
              <Button
                className="w-full group relative overflow-hidden"
                variant="default"
                size="lg"
                disabled={isUpgrading}
                onClick={handleUpgradeClick}
              >
                <div className="absolute inset-0 bg-web3-orange group-hover:bg-web3-orange/90 transition-all"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span>{isUpgrading ? 'Processing...' : 'Upgrade to Pro Roast for $49'}</span>
                </div>
              </Button>
              <p className="text-sm text-gray-400 text-center mt-2">
                A 20-minute video walkthrough I record myself. No account needed.
              </p>
            </div>

            {/* Category Breakdown and Next Steps - Mobile */}
            <ScoreSummary 
              score={analysis.score} 
              categories={analysis.categories}
              summary={analysis.summary}
              rawAnalysis={analysis.rawAnalysis}
              isAnonymous={locked}
              user={user}
              onSignUp={handleSignUp}
              onEmailSubmit={handleEmailSubmit}
              showOverallPerformance={false}
            />
            
            {/* Detailed Feedback - Mobile */}
            <div className="relative">
              <div className={cn(
                locked && "filter blur-lg select-none pointer-events-none"
              )}>
                <FeedbackSection findings={analysis.findings} />
              </div>
              
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-web3-dark/90 backdrop-blur-sm rounded-xl">
                  <SignupOverlay
                    onSignUp={handleSignUp}
                    onEmailSubmit={handleEmailSubmit}
                    title="Get the Full Report"
                    description="Every finding, ranked by impact, with the fix for each. Free, sent to your inbox."
                    icon="lock"
                  />
                </div>
              )}
            </div>
            
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block lg:col-span-2 space-y-6">
            <ScreenshotSection screenshotUrl={roast.screenshot_url} />
            
            
            {/* Detailed Feedback with blur overlay for anonymous users */}
            <div className="relative">
              <div className={cn(
                locked && "filter blur-lg select-none pointer-events-none"
              )}>
                <FeedbackSection findings={analysis.findings} />
              </div>
              
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-web3-dark/90 backdrop-blur-sm rounded-xl">
                  <SignupOverlay
                    onSignUp={handleSignUp}
                    onEmailSubmit={handleEmailSubmit}
                    title="Get the Full Report"
                    description="Every finding, ranked by impact, with the fix for each. Free, sent to your inbox."
                    icon="lock"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            {/* Overall Performance - Desktop only (in sidebar) */}
            <ScoreSummary
              score={analysis.score} 
              categories={analysis.categories}
              summary={analysis.summary}
              rawAnalysis={analysis.rawAnalysis}
              isAnonymous={locked}
              user={user}
              onSignUp={handleSignUp}
              onEmailSubmit={handleEmailSubmit}
            />

            {/* Upgrade CTA - Desktop only (in sidebar) */}
            <div id="pro-roast-offer">
              <Button
                className="w-full group relative overflow-hidden"
                variant="default"
                size="lg"
                disabled={isUpgrading}
                onClick={handleUpgradeClick}
              >
                <div className="absolute inset-0 bg-web3-orange group-hover:bg-web3-orange/90 transition-all"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span>{isUpgrading ? 'Processing...' : 'Upgrade to Pro Roast for $49'}</span>
                </div>
              </Button>
              <p className="text-sm text-gray-400 text-center mt-2">
                A 20-minute video walkthrough I record myself. No account needed.
              </p>
            </div>
            
          </div>
        </div>

        <div className="mt-8">
          <GrowthAuditBridge />
        </div>

        <div className="mt-10 text-center text-gray-500 text-sm">
          © 2025 Web3 ROAST. All rights reserved.
        </div>
      </div>

      <UpgradeBanner onUpgrade={handleUpgradeClick} isUpgrading={isUpgrading} />
    </div>
  );
};

export default Results;
