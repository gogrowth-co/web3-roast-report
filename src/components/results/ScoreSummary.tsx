
import ScoreCircle from '@/components/ScoreCircle';
import CategoryScore from '@/components/CategoryScore';
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ScoreSummaryProps {
  score: number;
  categories: { [key: string]: number };
  summary: string;
}

const ScoreSummary = ({ score, categories, summary }: ScoreSummaryProps) => {
  // Extract strength and weakness for next steps sections
  const highPriorityText = summary.split('.')[0] || "Improve your value proposition";
  const mediumPriorityText = summary.split('.')[1] || "Consider enhancing mobile responsiveness";
  
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

  return (
    <div className="space-y-6">
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

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-2">
          <h2 className="text-xl font-semibold">Next Steps</h2>
          <p className="text-gray-400">Recommended actions</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium text-lg">High Priority</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span>{highPriorityText}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Medium Priority</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  <span>{mediumPriorityText}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoreSummary;
