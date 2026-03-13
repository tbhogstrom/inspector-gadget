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
