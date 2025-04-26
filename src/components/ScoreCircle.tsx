
import React from 'react';

interface ScoreCircleProps {
  score: number;
}

const ScoreCircle = ({ score }: ScoreCircleProps) => {
  const circumference = 2 * Math.PI * 60; // r = 60, circumference = 2πr
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg className="w-full h-full" viewBox="0 0 140 140">
        {/* Background circle */}
        <circle
          cx="70"
          cy="70"
          r="60"
          fill="transparent"
          stroke="#e5e7eb20"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="70"
          cy="70"
          r="60"
          fill="transparent"
          stroke="url(#gradient)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        {/* Define gradient */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
        </defs>
        {/* Score text */}
        <text
          x="70"
          y="70"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="36"
          fontWeight="bold"
          fill="#ffffff"
        >
          {score}
        </text>
      </svg>
    </div>
  );
};

export default ScoreCircle;
