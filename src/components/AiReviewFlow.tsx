import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ReviewProgress } from '@/components/ReviewProgress';
import { AiCandidateCard } from '@/components/AiCandidateCard';
import { useReviewState } from '@/hooks/useReviewState';
import { toast } from 'sonner';
import type { AiReviewFlowProps, AcceptFlashcardsCommand, AcceptFlashcardsResponseDTO } from '@/types';

/**
 * Main React component managing the review flow
 * Displays all candidates in a scrollable list, handles accept/discard actions,
 * and submits accepted flashcards in batch
 */
export function AiReviewFlow({
  deckId,
  deckName,
  initialCandidates
}: AiReviewFlowProps) {
  const {
    candidates,
    handleAccept,
    handleDiscard,
    acceptedCount,
    remainingCount,
    acceptedCandidates
  } = useReviewState(initialCandidates);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation guard - warn when leaving with unsubmitted reviews
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (candidates.some(c => c.status !== 'pending')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [candidates]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const confirmed = confirm('Exit without saving? All review progress will be lost.');
        if (confirmed) {
          sessionStorage.removeItem(`flashcard-candidates-${deckId}`);
          window.location.href = `/decks/${deckId}`;
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deckId]);

  const handleDone = async () => {
    const flashcardsToSave = acceptedCandidates.map(c => ({
      front: c.front,
      back: c.back
    }));

    setIsSubmitting(true);
    setError(null);

    try {
      // Get session from localStorage
      const sessionData = localStorage.getItem('session');
      if (!sessionData) {
        toast.error('Session expired. Please log in again.');
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const session = JSON.parse(sessionData);
      const accessToken = session.access_token;

      const response = await fetch(`/api/decks/${deckId}/flashcards/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ flashcards: flashcardsToSave } as AcceptFlashcardsCommand)
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('session');
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (response.status === 404) {
        toast.error('Deck not found or access denied');
        window.location.href = '/decks';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save flashcards');
      }

      const data: AcceptFlashcardsResponseDTO = await response.json();

      // Clear candidates from sessionStorage
      sessionStorage.removeItem(`flashcard-candidates-${deckId}`);

      // Show success toast
      toast.success(`${data.total_created} flashcards added to ${deckName}`);

      // Navigate to deck detail
      window.location.href = `/decks/${deckId}`;

    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          setError('Network error. Your progress is saved. Please try again.');
          toast.error('Network error. Your progress is saved. Please try again.', {
            duration: 5000
          });
        } else {
          setError(err.message);
          toast.error(err.message, {
            action: {
              label: 'Retry',
              onClick: () => handleDone()
            }
          });
        }
      } else {
        setError('An unexpected error occurred');
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Screen reader announcements for accept/discard
  const announceAction = (action: 'accepted' | 'discarded') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = `Card ${action}`;
    announcement.className = 'sr-only';
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  };

  const handleAcceptWithAnnouncement = (id: string) => {
    handleAccept(id);
    announceAction('accepted');
  };

  const handleDiscardWithAnnouncement = (id: string) => {
    handleDiscard(id);
    announceAction('discarded');
  };

  return (
    <div
      className="min-h-screen bg-gray-50 py-8 px-4"
      role="main"
      aria-label="AI flashcard review"
    >
      <div className="max-w-4xl mx-auto">
        <ReviewProgress
          totalCount={candidates.length}
          remainingCount={remainingCount}
          acceptedCount={acceptedCount}
        />

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
          >
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          {candidates.map(candidate => (
            <AiCandidateCard
              key={candidate.id}
              candidate={candidate}
              onAccept={handleAcceptWithAnnouncement}
              onDiscard={handleDiscardWithAnnouncement}
            />
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-gray-700">
              {acceptedCount === 0 ? (
                <span>No flashcards selected. You can still finish to skip all.</span>
              ) : (
                <span>
                  Ready to add <span className="font-semibold">{acceptedCount}</span> flashcard
                  {acceptedCount !== 1 ? 's' : ''} to {deckName}
                </span>
              )}
            </p>
            <Button
              onClick={handleDone}
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? 'Saving...' : 'Done Reviewing'}
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Keyboard shortcuts: Press A to accept, D to discard, Escape to exit</p>
        </div>
      </div>
    </div>
  );
}
