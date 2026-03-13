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
