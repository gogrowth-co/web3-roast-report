import { useParams, useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRoastStatus } from '@/hooks/useRoastStatus';

// Define interfaces for our AI analysis data structure
interface Finding {
  category: string;
  severity: 'low' | 'medium' | 'high';
  feedback: string;
}

interface AIAnalysis {
  score: number;
  summary: string;
  findings: Finding[];
}

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h2 className="text-xl text-white font-bold mb-4">Invalid roast ID</h2>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  const { data: roast, isLoading, error } = useRoastStatus(id);

  if (isLoading || (roast && roast.status === 'pending')) {
    // Calculate which loading message to show based on time elapsed
    const getLoadingState = () => {
      if (!roast) return { message: "Initializing analysis...", description: "Getting things ready" };
      
      return {
        message: "AI is analyzing your project...",
        description: "This usually takes about 30 seconds"
      };
    };

    const { message, description } = getLoadingState();

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-web3-orange mb-4" />
        <h2 className="text-xl text-white font-bold">{message}</h2>
        <p className="text-gray-400 mt-2">{description}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h2 className="text-xl text-red-500 font-bold mb-4">Error loading results</h2>
        <Button onClick={() => navigate('/')}>Try Again</Button>
      </div>
    );
  }

  if (!roast) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h2 className="text-xl text-white font-bold mb-4">Results not found</h2>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  let analysis: AIAnalysis;
  try {
    if (typeof roast.ai_analysis === 'string') {
      analysis = JSON.parse(roast.ai_analysis) as AIAnalysis;
    } else if (roast.ai_analysis && typeof roast.ai_analysis === 'object') {
      analysis = roast.ai_analysis as unknown as AIAnalysis;
    } else {
      throw new Error('Invalid analysis data');
    }

    // Validate the required fields exist and are of correct type
    if (!analysis || 
        typeof analysis.score !== 'number' || 
        typeof analysis.summary !== 'string' || 
        !Array.isArray(analysis.findings)) {
      throw new Error('Invalid analysis data structure');
    }
  } catch (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h2 className="text-xl text-red-500 font-bold mb-4">Analysis data is incomplete</h2>
        <p className="text-gray-400 mb-4">The analysis didn't return the expected results.</p>
        <Button onClick={() => navigate('/')}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-900 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Analysis Results</h1>
            <div className="text-4xl font-bold text-web3-orange">
              {analysis.score}/100
            </div>
          </div>
          <p className="text-gray-300 mb-6">{analysis.summary}</p>
          <div className="space-y-6">
            {analysis.findings.map((finding, index) => (
              <div key={index} className="bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">
                    {finding.category}
                  </span>
                  <span className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${finding.severity === 'high' ? 'bg-red-500/20 text-red-300' :
                      finding.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'}
                  `}>
                    {finding.severity}
                  </span>
                </div>
                <p className="text-gray-300">{finding.feedback}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <Button 
            onClick={() => navigate('/')} 
            className="bg-web3-orange hover:bg-web3-orange/90"
          >
            Analyze Another Project
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
