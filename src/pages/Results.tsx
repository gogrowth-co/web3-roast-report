import { useParams } from 'react-router-dom';
import { useRoastStatus } from '@/hooks/useRoastStatus';
import LoadingState from '@/components/results/LoadingState';
import ErrorState from '@/components/results/ErrorState';
import ResultsHeader from '@/components/results/ResultsHeader';
import ScreenshotSection from '@/components/results/ScreenshotSection';
import FeedbackSection from '@/components/results/FeedbackSection';
import ScoreSummary from '@/components/results/ScoreSummary';
import UpgradeBanner from '@/components/results/UpgradeBanner';
import { useSession } from '@/hooks/useSession';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import SEO from '@/components/SEO';
import type { AIAnalysis } from '@/types/analysis';

const Results = () => {
  const { id } = useParams();
  const { user } = useSession();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [pageTitle, setPageTitle] = useState("Loading Results - Web3 ROAST");
  const [pageDescription, setPageDescription] = useState("Analyzing your Web3 project for UX issues and conversion opportunities.");

  if (!id) {
    return <ErrorState title="Invalid roast ID" />;
  }

  const { data: roast, isLoading, error, retryAnalysis, isRetrying, retryCount } = useRoastStatus(id);

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

  const handleUpgradeClick = async () => {
    if (!user) {
      toast.error("You must be logged in to upgrade");
      return;
    }

    setIsUpgrading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          roastId: id,
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
      categories: analysis.categoryScores
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
    <div className="min-h-screen bg-black">
      <SEO 
        title={pageTitle}
        description={seoDescription}
      />
      <ResultsHeader />

      <div className="max-w-7xl mx-auto px-4 py-8" id="report-root">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Web3 ROAST Results</h1>
          <p className="text-gray-400">Analysis for {roast.url}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ScreenshotSection screenshotUrl={roast.screenshot_url} />
            <FeedbackSection findings={analysis.findings} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <ScoreSummary 
              score={analysis.score} 
              categories={analysis.categories}
              summary={analysis.summary}
            />

            <Button
              className="w-full group relative overflow-hidden"
              variant="default"
              size="lg"
              disabled={isUpgrading}
              onClick={handleUpgradeClick}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span>{isUpgrading ? 'Processing...' : 'Upgrade to Expert Video Roast'}</span>
              </div>
            </Button>
            <p className="text-sm text-gray-400 text-center">
              Get expert personalized video feedback
            </p>
          </div>
        </div>

        <div className="mt-10 text-center text-gray-500 text-sm">
          © 2025 Web3 ROAST. All rights reserved.
        </div>
      </div>
      
      <UpgradeBanner />
    </div>
  );
};

export default Results;
