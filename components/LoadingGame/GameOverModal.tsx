// components/LoadingGame/GameOverModal.tsx
import React, { useState, useEffect } from 'react';

interface GameOverModalProps {
  score: number;
  onRestart: () => void;
  onSeeResults: () => void;
  analysisComplete: boolean;
}

export function GameOverModal({
  score,
  onRestart,
  onSeeResults,
  analysisComplete,
}: GameOverModalProps) {
  const [canInteract, setCanInteract] = useState(false);

  useEffect(() => {
    // 2.5 second delay before allowing interaction
    const timer = setTimeout(() => setCanInteract(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm text-center shadow-2xl">
        <h2 className="text-4xl font-bold text-red-600 mb-4">YOU'RE FIRED!</h2>

        <p className="text-lg text-slate-700 mb-6">
          Final Score: <span className="text-2xl font-bold text-blue-600">{score}</span>
        </p>

        <div className="space-y-3">
          <button
            onClick={onRestart}
            disabled={!canInteract}
            className={`w-full px-4 py-3 rounded-lg font-bold transition-all ${
              canInteract
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            Restart Game
          </button>

          <button
            onClick={onSeeResults}
            disabled={!canInteract}
            className={`w-full px-4 py-3 rounded-lg font-bold transition-all ${
              canInteract
                ? `${
                    analysisComplete
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-slate-600 text-white hover:bg-slate-700'
                  } cursor-pointer`
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            See Results
          </button>
        </div>

        {!canInteract && (
          <p className="text-xs text-slate-500 mt-4">Continuing in a moment...</p>
        )}
      </div>
    </div>
  );
}
