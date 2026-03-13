# Construction Worker Jumper Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an interactive pixel-art arcade game that plays during document analysis (15-30s), replacing static loading spinners with engaging gameplay featuring a construction worker jumping over debris.

**Architecture:**
- Central `LoadingGame.tsx` component manages game state and renders a Canvas-based game loop
- Game state machine handles Playing → GameOver → ResultsReady states
- Reusable across both bid-checker and inspection-report-analyser tools
- Lightweight Canvas API (no game engine) with pixel-art SVG sprites
- Input handling supports keyboard (spacebar) on desktop and tap (button + screen) on mobile

**Tech Stack:** React 19, Canvas API, SVG sprites, TypeScript, TailwindCSS

---

## File Structure

```
components/
  LoadingGame.tsx              [Main component, state orchestration]
  LoadingGame/
    GameCanvas.tsx            [Canvas rendering & game loop]
    GameState.ts              [Game logic: jump, collision, scoring]
    Sprites.tsx               [Pixel-art SVG construction worker + obstacles]
    GameOverModal.tsx         [Game over screen UI]
    ScoreDisplay.tsx          [Score counter at top-left]
    ResultsReadyBanner.tsx    [Green banner indicator]
    TapButton.tsx             [Mobile tap button]

lib/game/
  collision.ts                [Hitbox detection]
  difficulty.ts               [Progressive difficulty curve]
  constants.ts                [Game constants & magic numbers]
  types.ts                    [TypeScript interfaces]

__tests__/
  LoadingGame.test.ts
  game/
    collision.test.ts
    difficulty.test.ts
    GameState.test.ts
```

---

## Chunk 0: Test Infrastructure Setup

### Task 0: Configure Jest Testing Framework

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add Jest dependencies**

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest ts-jest
```

- [ ] **Step 2: Create Jest configuration**

```bash
# Create jest.config.js at project root
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
EOF
```

- [ ] **Step 3: Create Jest setup file**

```bash
cat > jest.setup.js << 'EOF'
import '@testing-library/jest-dom';
EOF
```

- [ ] **Step 4: Verify Jest works**

```bash
npm test -- --version
```

Expected: Jest version output

- [ ] **Step 5: Commit**

```bash
git add package.json jest.config.js jest.setup.js package-lock.json
git commit -m "chore: add Jest testing framework"
```

---

## Chunk 1: Foundation & Game Constants

### Task 1: Define Game Types

**Files:**
- Create: `lib/game/types.ts`

- [ ] **Step 1: Write types file with game interfaces**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/game/types.ts
git commit -m "feat: add game type definitions"
```

---

### Task 2: Define Game Constants

**Files:**
- Create: `lib/game/constants.ts`

- [ ] **Step 1: Write constants file**

```typescript
// lib/game/constants.ts
import { GameConfig } from './types';

export const GAME_CONFIG: GameConfig = {
  canvasWidth: 400,
  canvasHeight: 300,
  workerStartX: 50,
  workerStartY: 250,
  gravity: 0.6,
  jumpForce: 15,
  jumpDuration: 400, // ms
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/game/constants.ts
git commit -m "feat: define game configuration and constants"
```

---

### Task 3: Implement Collision Detection

**Files:**
- Create: `lib/game/collision.ts`
- Create: `__tests__/game/collision.test.ts`

- [ ] **Step 1: Write collision detection tests**

```typescript
// __tests__/game/collision.test.ts
import { checkCollision, getWorkerHitbox } from '@/lib/game/collision';
import { GameObject, Obstacle } from '@/lib/game/types';

describe('Collision Detection', () => {
  const worker: GameObject = {
    x: 50,
    y: 250,
    width: 20,
    height: 30,
  };

  const obstacle: Obstacle = {
    id: '1',
    type: 'brick',
    x: 60,
    y: 270,
    width: 50,
    height: 40,
    speed: 3,
  };

  test('detects collision when worker overlaps obstacle', () => {
    const result = checkCollision(worker, obstacle);
    expect(result).toBe(true);
  });

  test('no collision when obstacle is far away', () => {
    const distantObstacle = { ...obstacle, x: 200, y: 200 };
    const result = checkCollision(worker, distantObstacle);
    expect(result).toBe(false);
  });

  test('no collision when worker is above obstacle', () => {
    const aboveObstacle = { ...obstacle, y: 100 };
    const result = checkCollision(worker, aboveObstacle);
    expect(result).toBe(false);
  });

  test('detects grazing collision (tight hitbox)', () => {
    const grazeObstacle = {
      ...obstacle,
      x: worker.x + worker.width,
      y: worker.y,
    };
    const result = checkCollision(worker, grazeObstacle);
    expect(result).toBe(false); // No grazing
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/game/collision.test.ts
```

Expected: FAIL (functions don't exist)

- [ ] **Step 3: Implement collision detection**

```typescript
// lib/game/collision.ts
import { GameObject } from './types';

/**
 * Axis-Aligned Bounding Box collision detection
 * Returns true if two objects overlap
 */
export function checkCollision(obj1: GameObject, obj2: GameObject): boolean {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

/**
 * Get worker hitbox considering jump state
 */
export function getWorkerHitbox(
  x: number,
  y: number,
  width: number,
  height: number,
  isJumping: boolean
): GameObject {
  // Slightly smaller hitbox for tight collision detection
  const hitboxPadding = 2;
  return {
    x: x + hitboxPadding,
    y: y + hitboxPadding,
    width: width - hitboxPadding * 2,
    height: height - hitboxPadding * 2,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/game/collision.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/game/collision.ts __tests__/game/collision.test.ts
git commit -m "feat: implement collision detection with tight hitboxes"
```

---

### Task 4: Implement Difficulty Progression

**Files:**
- Create: `lib/game/difficulty.ts`
- Create: `__tests__/game/difficulty.test.ts`

- [ ] **Step 1: Write difficulty progression tests**

```typescript
// __tests__/game/difficulty.test.ts
import {
  getObstacleSpeed,
  getSpawnInterval,
  getDifficultyFactor,
} from '@/lib/game/difficulty';
import { GAME_MECHANICS, OBSTACLE_CONFIG } from '@/lib/game/constants';

describe('Difficulty Progression', () => {
  test('difficulty factor increases from 0 to 1 over game duration', () => {
    const factor0 = getDifficultyFactor(0);
    const factor15 = getDifficultyFactor(15000);
    const factor30 = getDifficultyFactor(30000);

    expect(factor0).toBeLessThan(factor15);
    expect(factor15).toBeLessThan(factor30);
    expect(factor30).toBeCloseTo(1.0, 1); // Should be ~1.0 at 30s
  });

  test('obstacle speed increases with difficulty', () => {
    const speedEarly = getObstacleSpeed(0);
    const speedLate = getObstacleSpeed(25000);

    expect(speedEarly).toBeLessThan(speedLate);
  });

  test('spawn interval decreases with difficulty (faster spawning)', () => {
    const intervalEarly = getSpawnInterval(0);
    const intervalLate = getSpawnInterval(25000);

    expect(intervalEarly).toBeGreaterThan(intervalLate);
  });

  test('speed stays within bounds', () => {
    const speeds = [0, 5000, 10000, 15000, 20000, 25000, 30000, 35000].map(
      getObstacleSpeed
    );
    speeds.forEach((speed) => {
      expect(speed).toBeGreaterThanOrEqual(OBSTACLE_CONFIG.minSpeed);
      expect(speed).toBeLessThanOrEqual(OBSTACLE_CONFIG.maxSpeed);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/game/difficulty.test.ts
```

Expected: FAIL (functions don't exist)

- [ ] **Step 3: Implement difficulty progression**

```typescript
// lib/game/difficulty.ts
import { GAME_MECHANICS, OBSTACLE_CONFIG } from './constants';

/**
 * Calculate difficulty factor (0 to 1) based on elapsed time
 * Linear progression over DIFFICULTY_DURATION
 */
export function getDifficultyFactor(elapsedMs: number): number {
  const factor = Math.min(
    elapsedMs / GAME_MECHANICS.difficultyDuration,
    1.0
  );
  return factor;
}

/**
 * Get current obstacle speed based on difficulty
 * Ranges from minSpeed to maxSpeed
 */
export function getObstacleSpeed(elapsedMs: number): number {
  const difficulty = getDifficultyFactor(elapsedMs);
  return (
    OBSTACLE_CONFIG.minSpeed +
    (OBSTACLE_CONFIG.maxSpeed - OBSTACLE_CONFIG.minSpeed) * difficulty
  );
}

/**
 * Get current obstacle spawn interval based on difficulty
 * Lower = faster spawning
 * Ranges from maxSpawnerInterval (start) to minSpawnerInterval (max difficulty)
 */
export function getSpawnInterval(elapsedMs: number): number {
  const difficulty = getDifficultyFactor(elapsedMs);
  return (
    OBSTACLE_CONFIG.maxSpawnerInterval -
    (OBSTACLE_CONFIG.maxSpawnerInterval - OBSTACLE_CONFIG.minSpawnerInterval) *
      difficulty
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/game/difficulty.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/game/difficulty.ts __tests__/game/difficulty.test.ts
git commit -m "feat: implement progressive difficulty curve"
```

---

## Chunk 2: Game State & Logic

### Task 5: Implement Core Game State

**Files:**
- Create: `lib/game/GameState.ts`
- Create: `__tests__/game/GameState.test.ts`

- [ ] **Step 1: Write game state tests**

```typescript
// __tests__/game/GameState.test.ts
import { GameStateManager } from '@/lib/game/GameState';
import { GAME_CONFIG } from '@/lib/game/constants';

describe('GameStateManager', () => {
  let gameState: GameStateManager;

  beforeEach(() => {
    gameState = new GameStateManager();
  });

  test('initializes with score 0 and playing state', () => {
    expect(gameState.getMetrics().score).toBe(0);
    expect(gameState.getState()).toBe('playing');
  });

  test('handles jump and increments score', () => {
    gameState.handleJump();
    expect(gameState.getMetrics().score).toBe(1);
  });

  test('handles power-up collection', () => {
    gameState.handlePowerUpCollected();
    expect(gameState.getMetrics().powerUpsCollected).toBe(1);
    expect(gameState.getMetrics().score).toBe(5); // 5 bonus points
  });

  test('handles collision and transitions to gameOver', () => {
    gameState.handleCollision();
    expect(gameState.getState()).toBe('gameOver');
  });

  test('resets for new game', () => {
    gameState.handleJump();
    gameState.handleCollision();
    gameState.reset();
    expect(gameState.getMetrics().score).toBe(0);
    expect(gameState.getState()).toBe('playing');
  });

  test('tracks elapsed time', () => {
    expect(gameState.getMetrics().elapsedTime).toBe(0);
    gameState.update(1000); // 1 second
    expect(gameState.getMetrics().elapsedTime).toBe(1000);
  });

  test('marks analysis as complete', () => {
    gameState.setAnalysisComplete();
    expect(gameState.isAnalysisComplete()).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/game/GameState.test.ts
```

Expected: FAIL (class doesn't exist)

- [ ] **Step 3: Implement GameStateManager**

```typescript
// lib/game/GameState.ts
import {
  GameMetrics,
  GameState,
  Obstacle,
  PowerUp,
  GameObject,
  GameObjectUnion,
} from './types';
import { GAME_MECHANICS, OBSTACLE_CONFIG, POWERUP_CONFIG } from './constants';
import { getObstacleSpeed, getSpawnInterval } from './difficulty';

export class GameStateManager {
  private metrics: GameMetrics = {
    score: 0,
    obstaclesJumped: 0,
    powerUpsCollected: 0,
    currentDifficulty: 0,
    elapsedTime: 0,
  };

  private gameState: GameState = 'playing';
  private analysisComplete = false;
  private objects: GameObjectUnion[] = [];
  private lastSpawnTime = 0;
  private nextObjectId = 0;

  update(deltaMs: number): void {
    this.metrics.elapsedTime += deltaMs;
    this.metrics.currentDifficulty = Math.min(
      this.metrics.elapsedTime / GAME_MECHANICS.difficultyDuration,
      1.0
    );

    // Move objects
    this.objects = this.objects.filter((obj) => {
      obj.y += (obj as any).speed;
      return obj.y < 400; // Remove off-screen objects
    });

    // Spawn new obstacles
    if (
      this.metrics.elapsedTime - this.lastSpawnTime >=
      getSpawnInterval(this.metrics.elapsedTime)
    ) {
      this.spawnObstacle();
      this.lastSpawnTime = this.metrics.elapsedTime;
    }
  }

  private spawnObstacle(): void {
    const shouldSpawnPowerUp =
      Math.random() < POWERUP_CONFIG.spawnChance;

    if (shouldSpawnPowerUp) {
      const powerUp: PowerUp = {
        id: `powerup-${this.nextObjectId++}`,
        type: 'energy-drink',
        x: Math.random() * (400 - POWERUP_CONFIG.width),
        y: -POWERUP_CONFIG.height,
        width: POWERUP_CONFIG.width,
        height: POWERUP_CONFIG.height,
        speed: getObstacleSpeed(this.metrics.elapsedTime),
      };
      this.objects.push(powerUp);
    } else {
      const obstacleTypes = OBSTACLE_CONFIG.types;
      const type = obstacleTypes[
        Math.floor(Math.random() * obstacleTypes.length)
      ];

      const obstacle: Obstacle = {
        id: `obstacle-${this.nextObjectId++}`,
        type: type as 'brick' | 'barrier' | 'tool' | 'cone',
        x: Math.random() * (400 - OBSTACLE_CONFIG.width),
        y: -OBSTACLE_CONFIG.height,
        width: OBSTACLE_CONFIG.width,
        height: OBSTACLE_CONFIG.height,
        speed: getObstacleSpeed(this.metrics.elapsedTime),
      };
      this.objects.push(obstacle);
    }
  }

  handleJump(): void {
    if (this.gameState === 'playing') {
      this.metrics.score += GAME_MECHANICS.pointsPerJump;
      this.metrics.obstaclesJumped += 1;
    }
  }

  handlePowerUpCollected(): void {
    if (this.gameState === 'playing') {
      this.metrics.powerUpsCollected += 1;
      this.metrics.score += POWERUP_CONFIG.bonusPoints;
    }
  }

  handleCollision(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'gameOver';
    }
  }

  removePowerUp(id: string): void {
    this.objects = this.objects.filter(obj => obj.id !== id);
  }

  setAnalysisComplete(): void {
    this.analysisComplete = true;
    if (this.gameState === 'playing') {
      this.gameState = 'resultsReady';
    }
  }

  reset(): void {
    this.metrics = {
      score: 0,
      obstaclesJumped: 0,
      powerUpsCollected: 0,
      currentDifficulty: 0,
      elapsedTime: 0,
    };
    this.gameState = 'playing';
    this.objects = [];
    this.lastSpawnTime = 0;
    this.analysisComplete = false;
  }

  // Getters
  getMetrics(): GameMetrics {
    return { ...this.metrics };
  }

  getState(): GameState {
    return this.gameState;
  }

  getObjects(): GameObjectUnion[] {
    return [...this.objects];
  }

  isAnalysisComplete(): boolean {
    return this.analysisComplete;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/game/GameState.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/game/GameState.ts __tests__/game/GameState.test.ts
git commit -m "feat: implement core game state management"
```

---

## Chunk 3: React Components

### Task 6: (Skipped - Using Canvas API directly)

**Note:** Sprites are rendered directly to Canvas using pure drawing functions in GameCanvas.tsx. No separate sprite components needed. This is more performant than React SVG components.

---

### Task 7: Create Game Canvas Component

**Files:**
- Create: `components/LoadingGame/GameCanvas.tsx`

- [ ] **Step 1: Implement GameCanvas**

```typescript
// components/LoadingGame/GameCanvas.tsx
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
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef(Date.now());

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
          const jumpHeight = 80;
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
```

- [ ] **Step 2: Commit**

```bash
git add components/LoadingGame/GameCanvas.tsx
git commit -m "feat: implement game canvas with rendering and collision detection"
```

---

### Task 8: Create Supporting UI Components

**Files:**
- Create: `components/LoadingGame/ScoreDisplay.tsx`
- Create: `components/LoadingGame/ResultsReadyBanner.tsx`
- Create: `components/LoadingGame/TapButton.tsx`
- Create: `components/LoadingGame/GameOverModal.tsx`

- [ ] **Step 1: ScoreDisplay component**

```typescript
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
```

- [ ] **Step 2: ResultsReadyBanner component**

```typescript
// components/LoadingGame/ResultsReadyBanner.tsx
import React from 'react';

interface ResultsReadyBannerProps {
  show: boolean;
}

export function ResultsReadyBanner({ show }: ResultsReadyBannerProps) {
  if (!show) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-green-100 border-2 border-green-500 rounded-lg p-3 animate-pulse">
      <p className="text-sm font-semibold text-green-700">✓ Your analysis is ready!</p>
    </div>
  );
}
```

- [ ] **Step 3: TapButton component (mobile)**

```typescript
// components/LoadingGame/TapButton.tsx
import React from 'react';

interface TapButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export function TapButton({
  onClick,
  disabled = false,
  label = 'TAP TO JUMP',
}: TapButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        absolute bottom-4 left-1/2 -translate-x-1/2
        px-6 py-3 rounded-lg font-bold text-white
        transition-all active:scale-95
        ${
          disabled
            ? 'bg-gray-400 cursor-not-allowed opacity-50'
            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
        }
      `}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 4: GameOverModal component**

```typescript
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
```

- [ ] **Step 5: Commit**

```bash
git add components/LoadingGame/ScoreDisplay.tsx components/LoadingGame/ResultsReadyBanner.tsx components/LoadingGame/TapButton.tsx components/LoadingGame/GameOverModal.tsx
git commit -m "feat: add UI components for score, banner, tap button, and game-over modal"
```

---

## Chunk 4: Main Component & Integration

### Task 9: Create Main LoadingGame Component

**Files:**
- Create: `components/LoadingGame.tsx`

- [ ] **Step 1: Implement main component**

```typescript
// components/LoadingGame.tsx
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
  }, [gameState.getMetrics]); // Dependency on getMetrics method

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
```

- [ ] **Step 2: Commit**

```bash
git add components/LoadingGame.tsx
git commit -m "feat: implement main LoadingGame component with state orchestration"
```

---

### Task 10: Integrate with BidChecker Tool

**Files:**
- Modify: `components/BidChecker.tsx`

**Context:** BidChecker currently shows "Analyzing bid..." during the 15-30 second wait. We need to replace that with the LoadingGame component.

- [ ] **Step 1: Review current BidChecker structure**

In `components/BidChecker.tsx`, the key parts are:
- `isProcessing` state tracks if analysis is in progress
- API calls happen in `handleSubmit` (parse PDF, then analyze)
- Form disables when `isProcessing = true`

- [ ] **Step 2: Add LoadingGame import and state**

```typescript
// At the top of BidChecker.tsx, add:
import { LoadingGame } from '@/components/LoadingGame';

// In the component, add new state after existing useState declarations:
const [analysisReady, setAnalysisReady] = useState(false);
const [finalScore, setFinalScore] = useState(0);
```

- [ ] **Step 3: Update handleSubmit to signal when analysis is done**

```typescript
// In handleSubmit, after successful analyzeResponse, add:
setAnalysisReady(true); // Signals to LoadingGame that analysis completed
```

- [ ] **Step 4: Replace loading UI with LoadingGame**

In the JSX render section, replace this:

```typescript
<UploadZone
  onFile={setBidFile}
  disabled={isProcessing}
  title={isProcessing ? 'Processing your bid' : 'Upload your contractor bid'}
  description="Drag & drop a PDF, TXT, or DOCX file, or click to select"
/>
```

With this:

```typescript
{isProcessing ? (
  <LoadingGame
    isAnalysisComplete={analysisReady}
    onGameEnd={(score) => {
      setFinalScore(score);
    }}
    onViewResults={() => {
      setIsProcessing(false);
      setAnalysisReady(false);
      // Results will display below because result is set
    }}
  />
) : (
  <UploadZone
    onFile={setBidFile}
    disabled={false}
    title="Upload your contractor bid"
    description="Drag & drop a PDF, TXT, or DOCX file, or click to select"
  />
)}
```

- [ ] **Step 5: Add score display (optional)**

After results display, optionally show the game score:

```typescript
{result && finalScore > 0 && (
  <p className="text-sm text-slate-600 mt-2">Game Score: {finalScore}</p>
)}
```

- [ ] **Step 6: Test in browser**

Run the dev server and test:
```bash
npm run dev
```

1. Upload a bid PDF
2. Game should appear instead of spinner
3. Spacebar/tap should make worker jump
4. After 15-30 seconds, green "ready" indicator should appear
5. Clicking "See Results" should close game and show analysis
6. "Restart Game" should let you play again

- [ ] **Step 7: Commit**

```bash
git add components/BidChecker.tsx
git commit -m "feat: integrate LoadingGame into BidChecker tool"
```

---

### Task 11: Test Integration

**Files:**
- Create: `__tests__/LoadingGame.integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// __tests__/LoadingGame.integration.test.ts
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { LoadingGame } from '@/components/LoadingGame';

describe('LoadingGame Integration', () => {
  test('renders game canvas and UI elements', () => {
    const { container } = render(
      <LoadingGame
        isAnalysisComplete={false}
        onGameEnd={jest.fn()}
        onViewResults={jest.fn()}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  test('calls onViewResults when See Results button is clicked', async () => {
    const onViewResults = jest.fn();
    const { container } = render(
      <LoadingGame
        isAnalysisComplete={true}
        onGameEnd={jest.fn()}
        onViewResults={onViewResults}
      />
    );

    // Simulate collision to trigger game over
    const canvas = container.querySelector('canvas');
    if (canvas) {
      fireEvent.click(canvas);
    }

    await waitFor(() => {
      const seeResultsButton = screen.getByText('See Results');
      expect(seeResultsButton).toBeInTheDocument();
    });

    const seeResultsButton = screen.getByText('See Results');
    fireEvent.click(seeResultsButton);

    await waitFor(() => {
      expect(onViewResults).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- __tests__/LoadingGame.integration.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/LoadingGame.integration.test.ts
git commit -m "test: add integration tests for LoadingGame"
```

---

## Final Checklist

- [ ] All tests passing: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] Game works on desktop (spacebar)
- [ ] Game works on mobile (tap button + screen tap)
- [ ] Score display updates in real-time
- [ ] Game-over modal appears with restart/results options
- [ ] Results ready indicator shows when analysis completes
- [ ] Difficulty progression smooth (obstacles get faster)
- [ ] Collision detection is tight (no grazing)
- [ ] Game integrates with bid-checker tool
- [ ] Code follows project patterns (Shadcn/UI, TailwindCSS, TypeScript)

---

## Known Limitations & Future Work

- Canvas rendering uses `requestAnimationFrame` — performance tested on mobile
- Sprites are simple SVG-based pixel art — can be enhanced with spritesheets later
- Leaderboard feature deferred to future release
- No sound (intentional, per spec)
- Game auto-resets on page reload (state is in-memory)
