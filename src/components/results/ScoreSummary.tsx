
import ScoreCircle from '@/components/ScoreCircle';
import CategoryScore from '@/components/CategoryScore';

interface ScoreSummaryProps {
  score: number;
  categories: { [key: string]: number };
}

const ScoreSummary = ({ score, categories }: ScoreSummaryProps) => {
  return (
    <div className="space-y-8">
      <div className="bg-zinc-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Overall Performance</h2>
        <p className="text-gray-400 mb-6">How your Web3 project scores</p>
        <ScoreCircle score={score} />
        <p className="text-center text-gray-400 mt-6">
          Your Web3 project is performing better than average.
        </p>
      </div>

      <div className="bg-zinc-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
        <p className="text-gray-400 mb-6">Performance by category</p>
        <div className="space-y-6">
          {categories && Object.entries(categories).length > 0 ? (
            Object.entries(categories).map(([name, score]) => (
              <CategoryScore key={name} name={name} score={score} />
            ))
          ) : (
            <p className="text-gray-400">Category breakdown not available</p>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <p className="text-gray-400 mb-6">Recommended actions</p>
        <div className="space-y-6">
          <Button className="w-full">Upgrade to Expert Video Roast</Button>
        </div>
      </div>
    </div>
  );
};

export default ScoreSummary;
