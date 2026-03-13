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
