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
