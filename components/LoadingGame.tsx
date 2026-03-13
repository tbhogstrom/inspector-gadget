'use client';

import React, { useState, useCallback } from 'react';
import { GameStateManager } from '@/lib/game/GameState';
import { GameCanvas } from './LoadingGame/GameCanvas';
import { ScoreDisplay } from './LoadingGame/ScoreDisplay';
import { ResultsReadyBanner } from './LoadingGame/ResultsReadyBanner';
import { TapButton } from './LoadingGame/TapButton';
import { GameOverModal } from './LoadingGame/GameOverModal';

interface LoadingGameProps {
  isAnalysisComplete: boolean;
  onGameEnd: (finalScore: number) => void;
  onViewResults: () => void;
}

export function LoadingGame({
  isAnalysisComplete,
  onGameEnd,
  onViewResults,
}: LoadingGameProps) {
  const [gameState] = useState(() => new GameStateManager());
  const [currentScore, setCurrentScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showResultsReady, setShowResultsReady] = useState(false);

  const handleCollision = useCallback(() => {
    setGameOver(true);
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setCurrentScore(finalScore);
    onGameEnd(finalScore);
  }, [onGameEnd]);

  const handleRestart = useCallback(() => {
    gameState.reset();
    setGameOver(false);
    setCurrentScore(0);
  }, [gameState]);

  const handleSeeResults = useCallback(() => {
    onViewResults();
  }, [onViewResults]);

  // Update displayed score each frame (sync with game state)
  React.useEffect(() => {
    const updateScore = setInterval(() => {
      setCurrentScore(gameState.getMetrics().score);
    }, 50);

    return () => clearInterval(updateScore);
  }, [gameState.getMetrics]);

  // Show results ready indicator
  React.useEffect(() => {
    if (isAnalysisComplete && gameState.getState() === 'playing') {
      setShowResultsReady(true);
    }
  }, [isAnalysisComplete, gameState]);

  return (
    <div className="relative w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 rounded-lg">
      <div className="relative">
        <GameCanvas
          gameState={gameState}
          isAnalysisComplete={isAnalysisComplete}
          onGameOver={handleGameOver}
          onCollision={handleCollision}
        />

        <ScoreDisplay score={currentScore} />
        <ResultsReadyBanner show={showResultsReady} />
        <TapButton
          onClick={() => {
            if (!gameOver && gameState.getState() === 'playing') {
              // Tap button just triggers canvas click
              const canvas = document.querySelector('canvas');
              if (canvas) canvas.click();
            }
          }}
          disabled={gameOver}
        />
      </div>

      {gameOver && (
        <GameOverModal
          score={currentScore}
          onRestart={handleRestart}
          onSeeResults={handleSeeResults}
          analysisComplete={isAnalysisComplete}
        />
      )}
    </div>
  );
}
