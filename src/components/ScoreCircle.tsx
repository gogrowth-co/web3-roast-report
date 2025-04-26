
import React from 'react';
import { Progress } from "@/components/ui/progress";

interface ScoreCircleProps {
  score: number;
}

const ScoreCircle = ({ score }: ScoreCircleProps) => {
  return (
    <div className="relative w-48 h-48 mx-auto">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl font-bold">{score}</span>
      </div>
      <Progress 
        value={score} 
        className="h-48 w-48 rounded-full [&>div]:rounded-full [&>div]:bg-web3-purple"
      />
    </div>
  );
};

export default ScoreCircle;
