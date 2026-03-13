// lib/game/types.ts

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle extends GameObject {
  id: string;
  type: 'brick' | 'barrier' | 'tool' | 'cone';
  speed: number;
}

export interface PowerUp extends GameObject {
  id: string;
  type: 'energy-drink';
  speed: number;
}

// Union type for all renderable game objects
export type GameObjectUnion = Obstacle | PowerUp;

export type GameState = 'playing' | 'gameOver' | 'resultsReady';

export interface GameMetrics {
  score: number;
  obstaclesJumped: number;
  powerUpsCollected: number;
  currentDifficulty: number;
  elapsedTime: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  workerStartX: number;
  workerStartY: number;
  gravity: number;
  jumpForce: number;
  jumpDuration: number;
}
