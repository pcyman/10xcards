import React, { useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import type { LoadingScreenProps } from '@/types';

/**
 * Modal overlay displaying AI generation progress with rotating messages
 * and cancel option
 */
export function LoadingScreen({ onCancel }: LoadingScreenProps) {
  const currentMessage = useGenerationProgress();

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Generating flashcards"
    >
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
            aria-hidden="true"
          />

          {/* Progress message */}
          <p className="text-lg font-medium text-center" aria-live="assertive">
            {currentMessage}
          </p>

          {/* Progress bar */}
          <Progress value={null} className="w-full" />

          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={onCancel}
            className="mt-4"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
