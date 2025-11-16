import React, { useEffect, useState } from 'react';
import { AiGenerationForm } from './AiGenerationForm';
import { toast } from 'sonner';
import type { DeckDTO } from '@/types';

interface AiGenerationFormWrapperProps {
  deckId: string;
}

/**
 * Wrapper component that handles authentication and deck fetching
 * before rendering the AiGenerationForm
 */
export function AiGenerationFormWrapper({ deckId }: AiGenerationFormWrapperProps) {
  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const sessionData = localStorage.getItem('session');
    if (!sessionData) {
      window.location.href = '/login';
      return;
    }

    // Fetch deck to get name and verify access
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
  }, [deckId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!deck) {
    return null;
  }

  return <AiGenerationForm deckId={deckId} deckName={deck.name} />;
}
