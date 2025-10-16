
import ScoreCircle from '@/components/ScoreCircle';
import CategoryScore from '@/components/CategoryScore';
import SignupOverlay from '@/components/results/SignupOverlay';
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import type { RawWeb3Analysis } from '@/types/analysis';
import type { User } from '@supabase/supabase-js';

interface ScoreSummaryProps {
  score: number;
  categories: { [key: string]: number };
  summary: string;
  rawAnalysis?: RawWeb3Analysis;
  isAnonymous?: boolean;
  user?: User | null;
  onSignUp?: () => void;
  showOverallPerformance?: boolean;
}

const ScoreSummary = ({ score, categories, summary, rawAnalysis, isAnonymous = false, user = null, onSignUp, showOverallPerformance = true }: ScoreSummaryProps) => {
  // Generate performance overview that highlights strengths and weaknesses
  const getPerformanceSummary = () => {
    // Find top category and weakest category
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0];
    const weakestCategory = sortedCategories[sortedCategories.length - 1];
    
    // Generate insights based on overall score
    let performanceLevel = "needs significant improvement";
    if (score >= 80) performanceLevel = "performs strongly";
    else if (score >= 60) performanceLevel = "shows promise but needs refinement";
    else if (score >= 40) performanceLevel = "needs targeted improvements";
    
    return `Your Web3 landing page ${performanceLevel} with an overall score of ${score}. Your strongest area is ${topCategory?.[0]} where your clear ${topCategory?.[0].toLowerCase()} helps build credibility. However, your ${weakestCategory?.[0]} could be holding you back - consider addressing this first for quick wins. Focus on making your value proposition immediately clear to visitors who may not be familiar with your specific Web3 technology.`;
  };

  // Group fix map items by severity
  const getGroupedRecommendations = () => {
    if (!rawAnalysis?.fixMap || rawAnalysis.fixMap.length === 0) {
      return { high: [], medium: [], low: [] };
    }

    return rawAnalysis.fixMap.reduce((acc, item) => {
      if (item.severity === 'high') acc.high.push(item);
      else if (item.severity === 'medium') acc.medium.push(item);
      else acc.low.push(item);
      return acc;
    }, { high: [] as typeof rawAnalysis.fixMap, medium: [] as typeof rawAnalysis.fixMap, low: [] as typeof rawAnalysis.fixMap });
  };

  const recommendations = getGroupedRecommendations();

  return (
    <div className="space-y-6">
      {showOverallPerformance && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold">Overall Performance</h2>
            <p className="text-gray-400">How your Web3 project scores</p>
          </CardHeader>
          <CardContent>
            <ScoreCircle score={score} />
            <p className="text-base text-gray-200 mt-6">
              {getPerformanceSummary()}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-2">
          <h2 className="text-xl font-semibold">Category Breakdown</h2>
          <p className="text-gray-400">Performance by category</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories && Object.entries(categories).length > 0 ? (
              Object.entries(categories).map(([name, score]) => (
                <CategoryScore key={name} name={name} score={score} />
              ))
            ) : (
              <p className="text-gray-400">Category breakdown not available</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Card className={cn(
          "border-zinc-800 bg-zinc-900",
          !user && isAnonymous && "filter blur-lg select-none pointer-events-none"
        )}>
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold">Next Steps</h2>
            <p className="text-gray-400">Actionable recommendations to improve your conversion rate</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recommendations.high.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h3 className="font-semibold text-lg">Critical Issues</h3>
                  </div>
                  {recommendations.high.map((item, idx) => (
                    <div key={idx} className="ml-7 space-y-2 pb-4 border-b border-zinc-800 last:border-0">
                      <p className="text-gray-200 font-medium">{item.issue}</p>
                      <div className="bg-zinc-800/50 p-3 rounded-md">
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-green-400">Fix: </span>
                          {item.suggestedFix}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {recommendations.medium.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold text-lg">Important Improvements</h3>
                  </div>
                  {recommendations.medium.map((item, idx) => (
                    <div key={idx} className="ml-7 space-y-2 pb-4 border-b border-zinc-800 last:border-0">
                      <p className="text-gray-200 font-medium">{item.issue}</p>
                      <div className="bg-zinc-800/50 p-3 rounded-md">
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-green-400">Fix: </span>
                          {item.suggestedFix}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recommendations.low.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Nice to Have</h3>
                  </div>
                  {recommendations.low.map((item, idx) => (
                    <div key={idx} className="ml-7 space-y-2 pb-4 border-b border-zinc-800 last:border-0">
                      <p className="text-gray-200 font-medium">{item.issue}</p>
                      <div className="bg-zinc-800/50 p-3 rounded-md">
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-green-400">Fix: </span>
                          {item.suggestedFix}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recommendations.high.length === 0 && recommendations.medium.length === 0 && recommendations.low.length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-400">No specific issues identified. Your landing page is performing well!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {!user && isAnonymous && onSignUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
            <SignupOverlay
              onSignUp={onSignUp}
              title="Unlock Actionable Recommendations"
              description="See exactly what to fix and how to improve your conversion rate with step-by-step guidance."
              icon="zap"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreSummary;
