import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AiCandidateCardProps } from '@/types';

/**
 * Display component for individual flashcard candidate with accept/discard actions
 * Shows front and back text with prominent action buttons
 */
export const AiCandidateCard = React.memo(function AiCandidateCard({
  candidate,
  onAccept,
  onDiscard
}: AiCandidateCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle if the card itself has focus, not its children
    if (e.target !== e.currentTarget) return;

    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      onAccept(candidate.id);
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      onDiscard(candidate.id);
    }
  };

  const isProcessed = candidate.status !== 'pending';
  const isAccepted = candidate.status === 'accepted';
  const isDiscarded = candidate.status === 'discarded';

  return (
    <article
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="transition-all duration-300"
      aria-label="Flashcard candidate"
    >
      <Card className={`focus-within:ring-2 focus-within:ring-blue-500 relative ${
        isAccepted ? 'border-2 border-green-500 bg-green-50' :
        isDiscarded ? 'border-2 border-gray-400 bg-gray-50' :
        ''
      }`}>
        {isAccepted && (
          <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accepted
          </div>
        )}
        {isDiscarded && (
          <div className="absolute top-4 right-4 bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Discarded
          </div>
        )}
        <CardHeader>
          <h3 className={`text-lg font-bold ${isProcessed ? 'pr-24' : ''}`} id={`card-front-${candidate.id}`}>
            {candidate.front}
          </h3>
        </CardHeader>
        <CardContent className="max-h-[200px] overflow-y-auto">
          <p className={`whitespace-pre-wrap ${
            isAccepted ? 'text-gray-800' :
            isDiscarded ? 'text-gray-500' :
            'text-gray-700'
          }`}>
            {candidate.back}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2 pt-4">
          <Button
            onClick={() => onAccept(candidate.id)}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={isProcessed}
            aria-label="Accept this flashcard"
          >
            Accept
          </Button>
          <Button
            onClick={() => onDiscard(candidate.id)}
            variant="outline"
            className="flex-1"
            disabled={isProcessed}
            aria-label="Discard this flashcard"
          >
            Discard
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
});
