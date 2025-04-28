
import { useParams } from 'react-router-dom';
import { useRoastStatus } from '@/hooks/useRoastStatus';
import LoadingState from '@/components/results/LoadingState';
import ErrorState from '@/components/results/ErrorState';
import ResultsHeader from '@/components/results/ResultsHeader';
import ScreenshotSection from '@/components/results/ScreenshotSection';
import FeedbackSection from '@/components/results/FeedbackSection';
import ScoreSummary from '@/components/results/ScoreSummary';
import type { AIAnalysis } from '@/types/analysis';

const Results = () => {
  const { id } = useParams();

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
        typeof analysis.score !== 'number' || 
        typeof analysis.summary !== 'string' || 
        !Array.isArray(analysis.findings) ||
        !analysis.categories) {
      console.error("Invalid analysis structure:", analysis);
      throw new Error('Invalid analysis data structure');
    }
  } catch (error: any) {
    console.error("Error parsing analysis data:", error, roast.ai_analysis);
    return (
      <ErrorState 
        title="Analysis data is incomplete" 
        description="The analysis didn't return the expected results." 
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ScreenshotSection screenshotUrl={roast.screenshot_url} />
            <FeedbackSection findings={analysis.findings} />
          </div>
          <div className="lg:col-span-1">
            <ScoreSummary 
              score={analysis.score} 
              categories={analysis.categories}
              summary={analysis.summary}
            />
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
