
import { useParams } from 'react-router-dom';
import { useRoastStatus } from '@/hooks/useRoastStatus';
import LoadingState from '@/components/results/LoadingState';
import ErrorState from '@/components/results/ErrorState';
import ResultsHeader from '@/components/results/ResultsHeader';
import ScreenshotSection from '@/components/results/ScreenshotSection';
import FeedbackSection from '@/components/results/FeedbackSection';
import ScoreSummary from '@/components/results/ScoreSummary';
import { useSession } from '@/hooks/useSession';
import { useState, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { AIAnalysis } from '@/types/analysis';

const Results = () => {
  const { id } = useParams();
  const { user } = useSession();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDownload = async () => {
    if (!resultsRef.current) return;
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save("web3-roast-results.pdf");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  if (!id) {
    return <ErrorState title="Invalid roast ID" />;
  }

  const { data: roast, isLoading, error } = useRoastStatus(id);

  if (isLoading || (roast && roast.status === 'pending')) {
    const getLoadingState = () => {
      if (!roast) return { 
        message: "Initializing analysis...", 
        description: "Getting things ready" 
      };
      
      return {
        message: "AI is analyzing your project...",
        description: "This usually takes about 30-60 seconds"
      };
    };

    const { message, description } = getLoadingState();
    return <LoadingState message={message} description={description} />;
  }

  if (error) {
    console.error("Error loading roast results:", error);
    return <ErrorState title="Error loading results" description={error.message} />;
  }

  if (!roast) {
    return <ErrorState title="Results not found" />;
  }

  if (roast.status === 'failed') {
    return <ErrorState title="Analysis failed" description="We couldn't complete the analysis of your project. Please try again." />;
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

  return (
    <div className="min-h-screen bg-black">
      <ResultsHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Web3 ROAST Results</h1>
          <p className="text-gray-400">Analysis for {roast.url}</p>
        </div>

        <div className="flex justify-end space-x-2 mb-4">
          <Button onClick={handleShare} variant="outline" className="border-zinc-700">Share Results</Button>
          <Button onClick={handleDownload} variant="outline" className="border-zinc-700">Download Report</Button>
        </div>

        <div ref={resultsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    </div>
  );
};

export default Results;
