import {
  GameMetrics,
  GameState,
  Obstacle,
  PowerUp,
  GameObjectUnion,
} from './types';
import { GAME_MECHANICS, OBSTACLE_CONFIG, POWERUP_CONFIG } from './constants';

// Placeholder functions for difficulty progression (Task 4)
function getObstacleSpeed(elapsedMs: number): number {
  const difficulty = Math.min(
    elapsedMs / GAME_MECHANICS.difficultyDuration,
    1.0
  );
  return (
    OBSTACLE_CONFIG.minSpeed +
    (OBSTACLE_CONFIG.maxSpeed - OBSTACLE_CONFIG.minSpeed) * difficulty
  );
}

function getSpawnInterval(elapsedMs: number): number {
  const difficulty = Math.min(
    elapsedMs / GAME_MECHANICS.difficultyDuration,
    1.0
  );
  return (
    OBSTACLE_CONFIG.maxSpawnerInterval -
    (OBSTACLE_CONFIG.maxSpawnerInterval - OBSTACLE_CONFIG.minSpawnerInterval) *
      difficulty
  );
}

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

    // Move objects (left across screen)
    this.objects = this.objects.filter((obj) => {
      obj.x -= (obj as any).speed;
      return obj.x > -obj.width; // Remove off-screen objects (left side)
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
    const shouldSpawnPowerUp = Math.random() < POWERUP_CONFIG.spawnChance;

    if (shouldSpawnPowerUp) {
      const powerUp: PowerUp = {
        id: `powerup-${this.nextObjectId++}`,
        type: 'energy-drink',
        x: 400, // Spawn on right side
        y: Math.random() * (300 - POWERUP_CONFIG.height), // Random Y for player to catch
        width: POWERUP_CONFIG.width,
        height: POWERUP_CONFIG.height,
        speed: getObstacleSpeed(this.metrics.elapsedTime),
      };
      this.objects.push(powerUp);
    } else {
      const obstacleTypes = OBSTACLE_CONFIG.types;
      const type =
        obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

      const obstacle: Obstacle = {
        id: `obstacle-${this.nextObjectId++}`,
        type: type as 'brick' | 'barrier' | 'tool' | 'cone',
        x: 400, // Spawn on right side
        y: 150, // Same Y axis for all obstacles
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
    this.objects = this.objects.filter((obj) => obj.id !== id);
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
