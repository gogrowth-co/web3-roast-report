
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Share2, Download } from "lucide-react";
import { useRoastStatus } from '@/hooks/useRoastStatus';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ScoreCircle from '@/components/ScoreCircle';
import CategoryScore from '@/components/CategoryScore';
import FeedbackItem from '@/components/FeedbackItem';

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
  categories: { [key: string]: number };
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied to clipboard", {
        description: "You can now share these results with others"
      });
    } catch (err) {
      toast("Failed to copy link", {
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-zinc-800 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Results
            </Button>
            <Button variant="secondary" disabled>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Web3 ROAST Results</h1>
              <p className="text-gray-400">Analysis for {roast.url}</p>
            </div>

            {/* Screenshot Section */}
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Screenshot</h2>
              <p className="text-gray-400 mb-4">Full page capture of your Web3 project</p>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <img src={roast.screenshot_url} alt="Website Screenshot" className="w-full" />
              </div>
            </div>

            {/* Feedback Section */}
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Detailed Feedback</h2>
              <p className="text-gray-400 mb-6">Brutally honest feedback to improve your Web3 project</p>
              
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="high">High Priority</TabsTrigger>
                  <TabsTrigger value="medium">Medium</TabsTrigger>
                  <TabsTrigger value="low">Low</TabsTrigger>
                  <TabsTrigger value="positives">Positives</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  {analysis.findings.map((finding, index) => (
                    <FeedbackItem key={index} {...finding} />
                  ))}
                </TabsContent>
                
                {/* Add other TabsContent components for filtered views */}
              </Tabs>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Score Card */}
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Overall Performance</h2>
              <p className="text-gray-400 mb-6">How your Web3 project scores</p>
              <ScoreCircle score={analysis.score} />
              <p className="text-center text-gray-400 mt-6">
                Your Web3 project is performing better than average.
              </p>
            </div>

            {/* Categories Card */}
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
              <p className="text-gray-400 mb-6">Performance by category</p>
              <div className="space-y-6">
                {Object.entries(analysis.categories).map(([name, score]) => (
                  <CategoryScore key={name} name={name} score={score} />
                ))}
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="bg-zinc-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
              <p className="text-gray-400 mb-6">Recommended actions</p>
              <div className="space-y-6">
                <Button className="w-full">Upgrade to Expert Video Roast</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
