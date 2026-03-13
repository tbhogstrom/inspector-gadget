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
