
import ScoreCircle from '@/components/ScoreCircle';
import CategoryScore from '@/components/CategoryScore';
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ScoreSummaryProps {
  score: number;
  categories: { [key: string]: number };
}

const ScoreSummary = ({ score, categories }: ScoreSummaryProps) => {
  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-2">
          <h2 className="text-xl font-semibold">Overall Performance</h2>
          <p className="text-gray-400">How your Web3 project scores</p>
        </CardHeader>
        <CardContent>
          <ScoreCircle score={score} />
          <p className="text-center text-gray-400 mt-6">
            Your Web3 project is performing better than average.
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
                  <span>Your value proposition is buried below the fold</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Medium Priority</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  <span>The wallet connection button is too small on mobile screens</span>
                </div>
              </div>
            </div>
            
            <Button className="w-full mt-6" variant="default">
              Upgrade to Expert Video Roast
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoreSummary;
