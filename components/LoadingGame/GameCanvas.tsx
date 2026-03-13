'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameStateManager } from '@/lib/game/GameState';
import { checkCollision, getWorkerHitbox } from '@/lib/game/collision';
import { GAME_CONFIG, COLORS } from '@/lib/game/constants';
import { Obstacle, PowerUp } from '@/lib/game/types';

// Canvas drawing helpers (pure Canvas API, no React)
function drawWorkerSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isJumping: boolean
) {
  const color = COLORS.worker;
  // Simplified pixel art: hard hat + body + legs
  ctx.fillStyle = '#FF6B35'; // Hard hat
  ctx.fillRect(x + 5, y + 2, 10, 8);
  ctx.fillStyle = color; // Head
  ctx.fillRect(x + 6, y + 10, 8, 6);
  ctx.fillStyle = '#FF6B35'; // Body
  ctx.fillRect(x + 5, y + 16, 10, 8);
  // Legs
  ctx.fillStyle = '#333333';
  ctx.fillRect(x + 7, y + 24, 2, 6);
  ctx.fillRect(x + 11, y + 24, 2, 6);
}

function drawObstacleSprite(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
  const color = COLORS.obstacle[obstacle.type];
  ctx.fillStyle = color;

  switch (obstacle.type) {
    case 'brick':
      // 2x2 brick pattern
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width / 2, obstacle.height / 2);
      ctx.fillRect(obstacle.x + obstacle.width / 2, obstacle.y, obstacle.width / 2, obstacle.height / 2);
      ctx.fillStyle = '#FF5533';
      ctx.fillRect(obstacle.x, obstacle.y + obstacle.height / 2, obstacle.width / 2, obstacle.height / 2);
      ctx.fillRect(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 2, obstacle.height / 2);
      break;
    case 'barrier':
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 5, obstacle.y + 10);
      ctx.lineTo(obstacle.x + 5, obstacle.y + obstacle.height - 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width - 5, obstacle.y + 10);
      ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + obstacle.height - 10);
      ctx.stroke();
      break;
    case 'tool':
      // Hammer shape
      ctx.fillRect(obstacle.x + obstacle.width / 3, obstacle.y + obstacle.height / 2, obstacle.width / 3, obstacle.height / 2);
      ctx.fillRect(obstacle.x + obstacle.width / 4, obstacle.y + obstacle.height / 4, obstacle.width / 2, obstacle.height / 4);
      break;
    case 'cone':
      // Triangle
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
      ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
      ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width / 4, obstacle.y + obstacle.height / 2);
      ctx.lineTo(obstacle.x + (3 * obstacle.width) / 4, obstacle.y + obstacle.height / 2);
      ctx.stroke();
      break;
  }
}

function drawPowerUpSprite(ctx: CanvasRenderingContext2D, powerUp: PowerUp) {
  ctx.fillStyle = COLORS.powerUp;
  ctx.fillRect(powerUp.x + 5, powerUp.y + 5, powerUp.width - 10, powerUp.height - 8);
  ctx.fillStyle = '#00FF8F';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(powerUp.x + 7, powerUp.y + 7, 4, powerUp.height - 12);
  ctx.globalAlpha = 1.0;
}

interface GameCanvasProps {
  gameState: GameStateManager;
  isAnalysisComplete: boolean;
  onGameOver: (finalScore: number) => void;
  onCollision: () => void;
}

export function GameCanvas({
  gameState,
  isAnalysisComplete,
  onGameOver,
  onCollision,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [workerY, setWorkerY] = useState(GAME_CONFIG.workerStartY);
  const [isJumping, setIsJumping] = useState(false);
  const [jumpStartTime, setJumpStartTime] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Handle spacebar input
  const handleKeyPress = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isJumping && gameState.getState() === 'playing') {
          initiateJump();
        }
      }
    },
    [isJumping, gameState]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const initiateJump = () => {
    setIsJumping(true);
    setJumpStartTime(Date.now());
    gameState.handleJump();
  };

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaMs = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Update game state
      gameState.update(deltaMs);

      // Update worker position (jump arc)
      if (isJumping) {
        const elapsedMs = now - jumpStartTime;
        const progress = Math.min(elapsedMs / GAME_CONFIG.jumpDuration, 1);

        if (progress < 1) {
          // Parabolic arc: start high, come down
          const jumpHeight = 130;
          const yOffset = -jumpHeight * (Math.sin(progress * Math.PI));
          setWorkerY(GAME_CONFIG.workerStartY + yOffset);
        } else {
          setWorkerY(GAME_CONFIG.workerStartY);
          setIsJumping(false);
        }
      }

      // Check collisions
      const workerHitbox = getWorkerHitbox(
        GAME_CONFIG.workerStartX,
        workerY,
        20,
        30,
        isJumping
      );

      const objects = gameState.getObjects();
      let collided = false;

      for (const obj of objects) {
        if (obj.type === 'energy-drink') {
          if (checkCollision(workerHitbox, obj)) {
            gameState.handlePowerUpCollected();
            gameState.removePowerUp(obj.id);
          }
        } else if (obj.type === 'brick' || obj.type === 'barrier' || obj.type === 'tool' || obj.type === 'cone') {
          if (checkCollision(workerHitbox, obj)) {
            collided = true;
            break;
          }
        }
      }

      if (collided) {
        gameState.handleCollision();
        onCollision();
      }

      // Mark analysis complete
      if (isAnalysisComplete && gameState.getState() === 'playing') {
        gameState.setAnalysisComplete();
      }

      // Render
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

      // Render worker sprite using canvas drawing
      drawWorkerSprite(ctx, GAME_CONFIG.workerStartX, workerY, isJumping);

      // Render obstacles and power-ups
      objects.forEach((obj) => {
        if (obj.type === 'energy-drink') {
          drawPowerUpSprite(ctx, obj);
        } else {
          drawObstacleSprite(ctx, obj);
        }
      });

      if (gameState.getState() === 'gameOver') {
        onGameOver(gameState.getMetrics().score);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, isJumping, jumpStartTime, workerY, isAnalysisComplete, onGameOver, onCollision]);

  const handleCanvasClick = () => {
    if (!isJumping && gameState.getState() === 'playing') {
      initiateJump();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.canvasWidth}
      height={GAME_CONFIG.canvasHeight}
      onClick={handleCanvasClick}
      className="border-2 border-slate-300 rounded-lg cursor-pointer bg-white"
    />
  );
}
