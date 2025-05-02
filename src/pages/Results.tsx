
import { useParams } from 'react-router-dom';
import { useRoastStatus } from '@/hooks/useRoastStatus';
import LoadingState from '@/components/results/LoadingState';
import ErrorState from '@/components/results/ErrorState';
import ResultsHeader from '@/components/results/ResultsHeader';
import ScreenshotSection from '@/components/results/ScreenshotSection';
import FeedbackSection from '@/components/results/FeedbackSection';
import ScoreSummary from '@/components/results/ScoreSummary';
import { useSession } from '@/hooks/useSession';
import { useState, useRef, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Share2, Download } from "lucide-react";
import { toast } from "sonner";
import type { AIAnalysis } from '@/types/analysis';

const Results = () => {
  const { id } = useParams();
  const { user } = useSession();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [persistedResult, setPersistedResult] = useState<AIAnalysis | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { data: roast, isLoading, error } = useRoastStatus(id || '');

  // Attempt to fetch persisted result from roast_results table
  useEffect(() => {
    const fetchPersistedResult = async () => {
      if (!id) return;
      
      try {
        console.log("Fetching persisted roast result:", id);
        const { data, error } = await supabase.functions.invoke('get-roast', {
          body: { id }
        });

        if (error) {
          console.error("Error fetching persisted result:", error);
          setFetchError("Failed to load roast results. Please try again later.");
          return;
        }

        if (data) {
          console.log("Found persisted roast result:", data);
          setPersistedResult(data);
        } else {
          setFetchError("Roast result not found.");
        }
      } catch (error) {
        console.error("Failed to fetch persisted result:", error);
        setFetchError("An unexpected error occurred while loading the roast results.");
      }
    };

    if (id) {
      fetchPersistedResult();
    }
  }, [id]);

  // Share functionality
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard", {
        description: "You can now share these results with others"
      });
    } catch (err) {
      toast.error("Failed to copy link", {
        description: "Please try again"
      });
    }
  };

  // Download functionality - temporarily removed
  const handleDownload = () => {
    toast.info("PDF export coming soon", {
      description: "This feature is currently under development"
    });
  };

  const handleUpgradeClick = async () => {
    if (!user) {
      toast.error("You must be logged in to upgrade", {
        description: "Please sign in to continue."
      });
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

  // Helper function to render content based on the data we have
  const renderContent = () => {
    // Invalid ID case
    if (!id) {
      return <ErrorState title="Invalid roast ID" />;
    }

    // Error from persisted result fetch
    if (fetchError) {
      return <ErrorState title="Roast not found" description={fetchError} />;
    }

    // If we have a persisted result, use that
    if (persistedResult) {
      return (
        <div className="min-h-screen bg-black">
          <ResultsHeader />

          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Web3 ROAST Results</h1>
              <p className="text-gray-400">Analysis for your web3 project</p>
            </div>

            <div className="flex justify-end space-x-2 mb-4">
              <Button variant="outline" onClick={handleShare} className="border-zinc-700">
                <Share2 className="h-4 w-4 mr-2" />
                Share Results
              </Button>
              <Button variant="outline" onClick={handleDownload} className="border-zinc-700">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>

            <div ref={resultsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ScreenshotSection screenshotUrl={persistedResult.screenshot_url || ""} />
                <FeedbackSection findings={persistedResult.findings} />
              </div>
              <div className="lg:col-span-1 space-y-6">
                <ScoreSummary 
                  score={persistedResult.score} 
                  categories={persistedResult.categories}
                  summary={persistedResult.summary}
                />

                {user ? (
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
                ) : (
                  <Button
                    className="w-full group relative overflow-hidden"
                    variant="default"
                    size="lg"
                    asChild
                  >
                    <a href="/auth">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        <span>Sign in to Upgrade</span>
                      </div>
                    </a>
                  </Button>
                )}
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
    }

    // Loading state
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

    // Error state from useRoastStatus
    if (error) {
      console.error("Error loading roast results:", error);
      return <ErrorState title="Error loading results" description={error.message} />;
    }

    // No roast data
    if (!roast) {
      return <ErrorState title="Results not found" />;
    }

    // Failed roast analysis
    if (roast.status === 'failed') {
      return <ErrorState title="Analysis failed" description="We couldn't complete the analysis of your project. Please try again." />;
    }

    // Process roast data
    let analysis: AIAnalysis;
    try {
      if (typeof roast.ai_analysis === 'string') {
        analysis = JSON.parse(roast.ai_analysis);
      } else if (roast.ai_analysis && typeof roast.ai_analysis === 'object') {
        analysis = roast.ai_analysis as unknown as AIAnalysis;
      } else {
        console.error("Invalid analysis data format:", roast.ai_analysis);
        return <LoadingState message="Processing analysis data..." description="Please wait while we process your results" />;
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
        screenshot_url: roast.screenshot_url
      };

      analysis = transformedAnalysis as unknown as AIAnalysis;

      // Store result in roast_results for future access if user is logged in
      if (user) {
        const storeResult = async () => {
          try {
            await supabase.functions.invoke('analyze-web3', {
              body: { 
                roastId: id,
                userId: user.id
              }
            });
          } catch (error) {
            console.error("Failed to store result:", error);
            // Non-blocking error - we can still show the result
          }
        };

        storeResult();
      }
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
            <Button variant="outline" onClick={handleShare} className="border-zinc-700">
              <Share2 className="h-4 w-4 mr-2" />
              Share Results
            </Button>
            <Button variant="outline" onClick={handleDownload} className="border-zinc-700">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
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

  // Main component return - ensures all hooks are called before any conditionals
  return renderContent();
};

export default Results;
