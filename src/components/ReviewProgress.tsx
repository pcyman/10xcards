import React from 'react';
import type { ReviewProgressProps } from '@/types';

/**
 * Header component displaying review progress, including title,
 * remaining count, and accepted count
 */
export const ReviewProgress = React.memo(function ReviewProgress({
  totalCount,
  remainingCount,
  acceptedCount
}: ReviewProgressProps) {
  return (
    <header className="mb-6" aria-live="polite">
      <h1 className="text-3xl font-bold mb-4">Review Generated Flashcards</h1>
      <div className="flex gap-6 text-lg">
        <p className="text-gray-700">
          {remainingCount > 0 ? (
            <>
              <span className="font-semibold">{remainingCount}</span> remaining
            </>
          ) : (
            <span className="font-semibold text-green-600">All reviewed</span>
          )}
        </p>
        <p className="text-gray-700">
          <span className="font-semibold text-green-600">{acceptedCount}</span> cards accepted
        </p>
      </div>
    </header>
  );
});
