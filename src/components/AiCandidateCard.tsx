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

  return (
    <article
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`transition-opacity duration-300 ${
        isProcessed ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Flashcard candidate"
    >
      <Card className="focus-within:ring-2 focus-within:ring-blue-500">
        <CardHeader>
          <h3 className="text-lg font-bold" id={`card-front-${candidate.id}`}>
            {candidate.front}
          </h3>
        </CardHeader>
        <CardContent className="max-h-[200px] overflow-y-auto">
          <p className="text-gray-700 whitespace-pre-wrap">
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
