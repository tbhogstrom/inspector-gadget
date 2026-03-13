'use client';

import { useState } from 'react';
import { LoadingGame } from '@/components/LoadingGame';

export default function GameTestPage() {
  const [gameEnded, setGameEnded] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  const handleGameEnd = (score: number) => {
    setFinalScore(score);
    setGameEnded(true);
  };

  const handleViewResults = () => {
    setGameEnded(false);
    setFinalScore(0);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-2xl space-y-6 pt-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-slate-900">🎮 Game Test</h1>
          <p className="text-sm text-slate-500">
            Test the Construction Worker Jumper game
          </p>
        </div>

        <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAnalysisComplete}
                onChange={(e) => setIsAnalysisComplete(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700">
                Analysis Complete (shows ready banner)
              </span>
            </label>
          </div>
          {gameEnded && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <strong>Game ended with score: {finalScore}</strong>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <LoadingGame
            isAnalysisComplete={isAnalysisComplete}
            onGameEnd={handleGameEnd}
            onViewResults={handleViewResults}
          />
        </div>

        <div className="space-y-2 rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-800">Controls:</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Desktop:</strong> Spacebar to jump</li>
            <li><strong>Mobile:</strong> Tap button or tap anywhere to jump</li>
            <li><strong>Objective:</strong> Jump to avoid obstacles (straight line at center)</li>
            <li><strong>Bonus:</strong> Catch green energy drinks at random heights (+5 points)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
