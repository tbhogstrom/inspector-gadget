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
