
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
        <span className="text-sm text-gray-300">{name}</span>
        <span className="text-sm text-gray-300">{score}%</span>
      </div>
      <Progress value={score} className="h-2 [&>div]:bg-web3-purple"/>
    </div>
  );
};

export default CategoryScore;
