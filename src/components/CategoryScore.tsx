
import React from 'react';
import { Progress } from "@/components/ui/progress";

interface CategoryScoreProps {
  name: string;
  score: number;
}

const CategoryScore = ({ name, score }: CategoryScoreProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm">{name}</span>
        <span className="text-sm text-gray-400">{score}%</span>
      </div>
      <Progress 
        value={score} 
        className="h-2 bg-gray-700/30 [&>div]:bg-web3-purple"
      />
    </div>
  );
};

export default CategoryScore;
