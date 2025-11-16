import { useState } from "react";
import type {
  FlashcardDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  PaginatedResponseDTO,
  PaginationDTO,
} from "@/types";

interface UseDeckFlashcardsReturn {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  createFlashcard: (command: CreateFlashcardCommand) => Promise<void>;
  updateFlashcard: (
    id: string,
    command: UpdateFlashcardCommand,
  ) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
}

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const session = localStorage.getItem("session");
  if (!session) {
    throw new Error("No session found");
  }

  const sessionData = JSON.parse(session);
  return {
    Authorization: `Bearer ${sessionData.access_token}`,
  };
}

export function useDeckFlashcards(
  deckId: string,
  initialData: PaginatedResponseDTO<FlashcardDTO>,
): UseDeckFlashcardsReturn {
  const [flashcards, setFlashcards] = useState(initialData.data);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMore = pagination.page < pagination.total_pages;

  // Load more flashcards
  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/decks/${deckId}/flashcards?page=${pagination.page + 1}&limit=50`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load more flashcards");
      }

      const data: PaginatedResponseDTO<FlashcardDTO> = await response.json();

      setFlashcards((prev) => [...prev, ...data.data]);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to load more flashcards:", error);
      throw error;
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Create flashcard with optimistic update
  const createFlashcard = async (command: CreateFlashcardCommand) => {
    // Optimistic flashcard (temporary)
    const optimisticFlashcard: FlashcardDTO = {
      id: `temp-${Date.now()}`,
      deck_id: deckId,
      front: command.front,
      back: command.back,
      is_ai_generated: false,
      next_review_date: new Date().toISOString(),
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setFlashcards((prev) => [optimisticFlashcard, ...prev]);
    setPagination((prev) => ({ ...prev, total: prev.total + 1 }));

    try {
      const response = await fetch(`/api/decks/${deckId}/flashcards`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) throw new Error("Failed to create flashcard");

      const created: FlashcardDTO = await response.json();

      // Replace optimistic with real data
      setFlashcards((prev) =>
        prev.map((f) => (f.id === optimisticFlashcard.id ? created : f)),
      );
    } catch (error) {
      // Rollback on error
      setFlashcards((prev) =>
        prev.filter((f) => f.id !== optimisticFlashcard.id),
      );
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      throw error;
    }
  };

  // Update flashcard with optimistic update
  const updateFlashcard = async (
    id: string,
    command: UpdateFlashcardCommand,
  ) => {
    // Store previous state for rollback
    const prevFlashcards = [...flashcards];

    // Optimistic update
    setFlashcards((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, ...command, updated_at: new Date().toISOString() }
          : f,
      ),
    );

    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) throw new Error("Failed to update flashcard");

      const updated: FlashcardDTO = await response.json();

      // Replace with server response
      setFlashcards((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (error) {
      // Rollback on error
      setFlashcards(prevFlashcards);
      throw error;
    }
  };

  // Delete flashcard with optimistic update
  const deleteFlashcard = async (id: string) => {
    // Store for rollback
    const prevFlashcards = [...flashcards];
    const prevPagination = { ...pagination };

    // Optimistic update
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
    setPagination((prev) => ({ ...prev, total: prev.total - 1 }));

    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to delete flashcard");
    } catch (error) {
      // Rollback on error
      setFlashcards(prevFlashcards);
      setPagination(prevPagination);
      throw error;
    }
  };

  return {
    flashcards,
    pagination,
    isLoadingMore,
    hasMore,
    loadMore,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
  };
}
