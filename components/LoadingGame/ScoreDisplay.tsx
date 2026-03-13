// components/LoadingGame/ScoreDisplay.tsx
import React from 'react';

interface ScoreDisplayProps {
  score: number;
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  return (
    <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md">
      <p className="text-sm font-bold text-slate-800">SCORE</p>
      <p className="text-2xl font-bold text-blue-600">{score}</p>
    </div>
  );
}
