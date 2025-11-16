import React, { useEffect, useState } from 'react';
import { AiReviewFlow } from './AiReviewFlow';
import { toast } from 'sonner';
import type { DeckDTO, FlashcardCandidateDTO } from '@/types';

interface AiReviewFlowWrapperProps {
  deckId: string;
}

/**
 * Wrapper component that handles authentication, deck fetching,
 * and candidate retrieval before rendering the AiReviewFlow
 */
export function AiReviewFlowWrapper({ deckId }: AiReviewFlowWrapperProps) {
  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [candidates, setCandidates] = useState<FlashcardCandidateDTO[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const sessionData = localStorage.getItem('session');
    if (!sessionData) {
      window.location.href = '/login';
      return;
    }

    // Retrieve candidates from sessionStorage
    const storedData = sessionStorage.getItem(`flashcard-candidates-${deckId}`);

    if (!storedData) {
      toast.info('No candidates to review. Please generate flashcards first.');
      window.location.href = `/decks/${deckId}/generate`;
      return;
    }

    try {
      const parsedCandidates = JSON.parse(storedData) as FlashcardCandidateDTO[];

      if (parsedCandidates.length < 5) {
        toast.error('Insufficient candidates generated');
        window.location.href = `/decks/${deckId}/generate`;
        return;
      }

      setCandidates(parsedCandidates);

      // Fetch deck to get name
      const session = JSON.parse(sessionData);
      fetch(`/api/decks/${deckId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
        .then(response => {
          if (response.status === 401) {
            localStorage.removeItem('session');
            window.location.href = '/login';
            return;
          }
          if (!response.ok) {
            toast.error('Deck not found or access denied');
            window.location.href = '/decks';
            return;
          }
          return response.json();
        })
        .then(deckData => {
          if (deckData) {
            setDeck(deckData);
            setLoading(false);
          }
        })
        .catch(error => {
          toast.error('Failed to load deck');
          window.location.href = '/decks';
        });
    } catch (error) {
      toast.error('Failed to load candidates');
      window.location.href = `/decks/${deckId}/generate`;
    }
  }, [deckId]);

  if (loading || !deck || !candidates) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <AiReviewFlow
      deckId={deckId}
      deckName={deck.name}
      initialCandidates={candidates}
    />
  );
}
