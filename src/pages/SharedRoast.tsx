
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LoadingState from '@/components/results/LoadingState';
import ErrorState from '@/components/results/ErrorState';
import ResultsHeader from '@/components/results/ResultsHeader';
import ScreenshotSection from '@/components/results/ScreenshotSection';
import FeedbackSection from '@/components/results/FeedbackSection';
import ScoreSummary from '@/components/results/ScoreSummary';
import SEO from '@/components/SEO';
import type { AIAnalysis } from '@/types/analysis';

const SharedRoast = () => {
  const { shareId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [roast, setRoast] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [pageTitle, setPageTitle] = useState("Shared Web3 ROAST Results");
  const [pageDescription, setPageDescription] = useState("View shared Web3 project analysis results and recommendations.");

  useEffect(() => {
    const fetchSharedRoast = async () => {
      if (!shareId) {
        setError(new Error('Invalid share ID'));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase.functions.invoke('get-shared-roast', {
          body: { shareId }
        });

        if (error) {
          console.error("Error fetching shared roast:", error);
          throw new Error(error.message);
        }

        if (!data?.roast) {
          console.error("No roast data returned:", data);
          throw new Error('Shared roast not found');
        }

        setRoast(data.roast);
        
        // Parse the AI analysis
        try {
          let analysisData: AIAnalysis;
          
          if (typeof data.roast.ai_analysis === 'string') {
            analysisData = JSON.parse(data.roast.ai_analysis);
          } else if (data.roast.ai_analysis && typeof data.roast.ai_analysis === 'object') {
            analysisData = data.roast.ai_analysis as unknown as AIAnalysis;
          } else {
            throw new Error('Invalid analysis data format');
          }

          if (!analysisData || 
              typeof analysisData.overallScore !== 'number' || 
              !analysisData.categoryScores ||
              !Array.isArray(analysisData.feedback)) {
            throw new Error('Invalid analysis structure');
          }

          const transformedAnalysis = {
            score: analysisData.overallScore,
            summary: analysisData.feedback
              .filter(f => f.severity === 'high')
              .map(f => f.feedback)
              .join('. ') || 'Web3 project analyzed successfully',
            findings: analysisData.feedback.map(f => ({
              category: f.category,
              severity: f.severity,
              feedback: f.feedback
            })),
            categories: analysisData.categoryScores,
            rawAnalysis: analysisData.rawAnalysis
          };

          setAnalysis(transformedAnalysis as unknown as AIAnalysis);
        } catch (err: any) {
          console.error('Analysis parse error:', err);
          throw new Error('Failed to parse analysis data: ' + err.message);
        }
      } catch (err: any) {
        console.error('Error fetching shared roast:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedRoast();
  }, [shareId]);

  // Update metadata when roast data is loaded
  useEffect(() => {
    if (roast && roast.url) {
      try {
        const domain = new URL(roast.url).hostname;
        setPageTitle(`Shared Analysis for ${domain} - Web3 ROAST`);
        setPageDescription(`Shared Web3 ROAST analysis results and improvement recommendations for ${domain}.`);
      } catch (err) {
        // If URL parsing fails, keep default title
      }
    }
  }, [roast]);

  if (isLoading) {
    return (
      <>
        <SEO title={pageTitle} description={pageDescription} />
        <LoadingState message="Loading shared results..." description="Please wait while we retrieve the analysis" />
      </>
    );
  }

  if (error || !roast || !analysis) {
    return (
      <>
        <SEO 
          title="Error - Web3 ROAST"
          description="The shared analysis could not be loaded. It may have been removed or the link is invalid."
          noIndex={true}
        />
        <ErrorState title="Error loading shared results" description={error?.message || 'Could not load shared analysis'} />
      </>
    );
  }

  // Extract a meaningful description from the analysis
  const seoDescription = analysis.summary && analysis.summary.length > 150
    ? analysis.summary.substring(0, 147) + "..."
    : analysis.summary || pageDescription;

  return (
    <div className="min-h-screen bg-black">
      <SEO 
        title={pageTitle}
        description={seoDescription}
        ogType="article"
        ogImageUrl={roast.screenshot_url || "https://web3roast.com/og-image.png"}
        canonicalUrl={`https://web3roast.com/share/${shareId}`}
      />
      <ResultsHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Shared Web3 ROAST Results</h1>
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
              rawAnalysis={analysis.rawAnalysis}
            />
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">About Shared Results</h3>
              <p className="text-sm text-gray-400">
                This is a shared Web3 ROAST analysis. To create your own analysis,
                visit our <a href="/" className="text-blue-400 hover:underline">homepage</a>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-gray-500 text-sm">
          © 2025 Web3 ROAST. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default SharedRoast;
