// lib/game/constants.ts
import { GameConfig } from './types';

export const GAME_CONFIG: GameConfig = {
  canvasWidth: 400,
  canvasHeight: 300,
  workerStartX: 50,
  workerStartY: 150,
  gravity: 0.3,
  jumpForce: 15,
  jumpDuration: 600, // ms - longer jump window
};

export const OBSTACLE_CONFIG = {
  minSpawnerInterval: 1200, // ms at max difficulty
  maxSpawnerInterval: 2500, // ms at start
  minSpeed: 2, // pixels per frame at start
  maxSpeed: 8, // pixels per frame at max difficulty
  width: 50,
  height: 40,
  types: ['brick', 'barrier', 'tool', 'cone'] as const,
} as const;

export const POWERUP_CONFIG = {
  spawnChance: 0.25, // 20-30% → 25% chance per obstacle spawn
  width: 30,
  height: 30,
  speed: (obsSpeed: number) => obsSpeed, // same speed as obstacle
  bonusPoints: 5,
} as const;

export const GAME_MECHANICS = {
  pointsPerJump: 1,
  gameOverDelay: 2500, // ms before allowing restart/results
  difficultyDuration: 30000, // 30 seconds to reach max difficulty
  targetObstacles: 11, // ~10-12 obstacles in 15-30 seconds
} as const;

export const COLORS = {
  worker: '#FFD700', // Golden yellow
  obstacle: {
    brick: '#FF6B35',
    barrier: '#FF8C42',
    tool: '#8B4513',
    cone: '#FFA500',
  },
  powerUp: '#00FF41', // Neon green
  background: '#E8F4F8',
  gameOver: '#FF4444',
  resultsReady: '#44FF44',
} as const;
