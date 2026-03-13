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
