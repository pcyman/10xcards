import { useState, useCallback, useMemo } from 'react';
import type { FlashcardCandidateDTO, CandidateWithStatus } from '@/types';

/**
 * Custom hook to manage review state logic and actions
 * Encapsulates candidate state management, accept/discard handlers,
 * and computed values for the review flow
 */
export function useReviewState(initialCandidates: FlashcardCandidateDTO[]) {
  // Initialize candidates with ids and status
  const [candidates, setCandidates] = useState<CandidateWithStatus[]>(() =>
    initialCandidates.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      status: 'pending' as const
    }))
  );

  // Accept handler
  const handleAccept = useCallback((id: string) => {
    setCandidates(prev =>
      prev.map(c => c.id === id ? { ...c, status: 'accepted' as const } : c)
    );
  }, []);

  // Discard handler
  const handleDiscard = useCallback((id: string) => {
    setCandidates(prev =>
      prev.map(c => c.id === id ? { ...c, status: 'discarded' as const } : c)
    );
  }, []);

  // Computed counts
  const acceptedCount = useMemo(
    () => candidates.filter(c => c.status === 'accepted').length,
    [candidates]
  );

  const remainingCount = useMemo(
    () => candidates.filter(c => c.status === 'pending').length,
    [candidates]
  );

  const acceptedCandidates = useMemo(
    () => candidates.filter(c => c.status === 'accepted'),
    [candidates]
  );

  return {
    candidates,
    handleAccept,
    handleDiscard,
    acceptedCount,
    remainingCount,
    acceptedCandidates
  };
}
