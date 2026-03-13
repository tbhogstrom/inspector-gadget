import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { LoadingGame } from '@/components/LoadingGame';

// Mock the GameCanvas component to avoid canvas context issues
jest.mock('@/components/LoadingGame/GameCanvas', () => {
  return {
    GameCanvas: ({ onGameOver, onCollision }: any) => (
      <div data-testid="game-canvas-mock">
        <button
          data-testid="trigger-game-over"
          onClick={() => {
            onGameOver(42);
            onCollision();
          }}
        >
          Trigger Game Over
        </button>
        <canvas className="border-2 border-slate-300 rounded-lg cursor-pointer bg-white" />
      </div>
    ),
  };
});

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

  test('shows game over modal when collision triggers', async () => {
    const { getByTestId } = render(
      <LoadingGame
        isAnalysisComplete={true}
        onGameEnd={jest.fn()}
        onViewResults={jest.fn()}
      />
    );

    const triggerButton = getByTestId('trigger-game-over');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const modal = screen.getByText("YOU'RE FIRED!");
      expect(modal).toBeInTheDocument();
    });
  });

  test('calls onGameEnd when game ends with score', async () => {
    const onGameEnd = jest.fn();
    const { getByTestId } = render(
      <LoadingGame
        isAnalysisComplete={false}
        onGameEnd={onGameEnd}
        onViewResults={jest.fn()}
      />
    );

    const triggerButton = getByTestId('trigger-game-over');
    fireEvent.click(triggerButton);

    await waitFor(
      () => {
        expect(onGameEnd).toHaveBeenCalledWith(42);
      },
      { timeout: 2000 }
    );
  });

  test('displays final score in game over modal', async () => {
    const { getByTestId } = render(
      <LoadingGame
        isAnalysisComplete={true}
        onGameEnd={jest.fn()}
        onViewResults={jest.fn()}
      />
    );

    const triggerButton = getByTestId('trigger-game-over');
    fireEvent.click(triggerButton);

    // Verify the modal appears with the score span element
    await waitFor(
      () => {
        const modal = screen.getByText("YOU'RE FIRED!");
        expect(modal).toBeInTheDocument();
        // Check that there's a "Final Score:" text and the score is displayed
        expect(screen.getByText(/Final Score:/)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test('calls onViewResults when See Results button is clicked after game over', async () => {
    const onViewResults = jest.fn();
    const { getByTestId } = render(
      <LoadingGame
        isAnalysisComplete={true}
        onGameEnd={jest.fn()}
        onViewResults={onViewResults}
      />
    );

    const triggerButton = getByTestId('trigger-game-over');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const modal = screen.getByText("YOU'RE FIRED!");
      expect(modal).toBeInTheDocument();
    });

    // Wait for the 2.5 second delay in GameOverModal before buttons are enabled
    await waitFor(
      () => {
        const seeResultsButton = screen.getByText('See Results');
        fireEvent.click(seeResultsButton);
        expect(onViewResults).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });
});
