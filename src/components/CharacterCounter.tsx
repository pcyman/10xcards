import React from 'react';
import type { CharacterCounterProps } from '@/types';

/**
 * Display component showing character count with color-coded visual feedback
 * based on validation state
 */
export const CharacterCounter = React.memo(function CharacterCounter({
  count,
  state,
  message
}: CharacterCounterProps) {
  const colorClasses = {
    'invalid-min': 'text-gray-500',
    'valid': 'text-green-600',
    'invalid-max': 'text-red-600'
  };

  return (
    <div className={`text-sm ${colorClasses[state]}`} aria-live="polite">
      <span className="font-medium">{count.toLocaleString()} / 10,000 characters</span>
      {message && <span className="ml-2">- {message}</span>}
    </div>
  );
});
