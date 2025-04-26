
import { useParams } from 'react-router-dom';
import { useRoastStatus } from '@/hooks/useRoastStatus';
import { Button } from "@/components/ui/button";
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
        description: "This usually takes about 30 seconds"
      };
    };

    const { message, description } = getLoadingState();
    return <LoadingState message={message} description={description} />;
  }

  if (error) {
    return <ErrorState title="Error loading results" />;
  }

  if (!roast) {
    return <ErrorState title="Results not found" />;
  }

  let analysis: AIAnalysis;
  try {
    if (typeof roast.ai_analysis === 'string') {
      analysis = JSON.parse(roast.ai_analysis);
    } else if (roast.ai_analysis && typeof roast.ai_analysis === 'object') {
      analysis = roast.ai_analysis as unknown as AIAnalysis;
    } else {
      throw new Error('Invalid analysis data');
    }

    if (!analysis || 
        typeof analysis.score !== 'number' || 
        typeof analysis.summary !== 'string' || 
        !Array.isArray(analysis.findings)) {
      throw new Error('Invalid analysis data structure');
    }
  } catch (error) {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Web3 ROAST Results</h1>
              <p className="text-gray-400">Analysis for {roast.url}</p>
            </div>

            <ScreenshotSection screenshotUrl={roast.screenshot_url} />
            <FeedbackSection findings={analysis.findings} />
          </div>

          <ScoreSummary score={analysis.score} categories={analysis.categories} />
        </div>
      </div>
    </div>
  );
};

export default Results;
