import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { DeckDTO, CreateDeckCommand, UpdateDeckCommand, PaginationDTO, DeckListQueryParams } from "@/types";
import { listDecks, createDeck, updateDeck, deleteDeck } from "@/lib/api/deck-api";

interface UseDeckListReturn {
  decks: DeckDTO[];
  pagination: PaginationDTO;
  isLoading: boolean;
  error: string | null;
  createDeck: (command: CreateDeckCommand) => Promise<void>;
  updateDeck: (id: string, command: UpdateDeckCommand) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for deck list state management
 * Handles CRUD operations with optimistic updates and error handling
 */
export function useDeckList(initialDecks: DeckDTO[], initialPagination: PaginationDTO): UseDeckListReturn {
  const [decks, setDecks] = useState<DeckDTO[]>(initialDecks);
  const [pagination, setPagination] = useState<PaginationDTO>(initialPagination);
  const [isLoading, setIsLoading] = useState(initialDecks.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Load initial data if not provided
  useEffect(() => {
    if (initialDecks.length === 0 && pagination.total === 0) {
      loadPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Create a new deck with optimistic update
   */
  const handleCreateDeck = useCallback(async (command: CreateDeckCommand) => {
    try {
      const newDeck = await createDeck(command);

      // Optimistic update
      setDecks((prev) => [newDeck, ...prev]);

      // Update pagination total
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
        total_pages: Math.ceil((prev.total + 1) / prev.limit),
      }));

      toast.success("Deck created successfully");
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to create deck");
        throw err; // Re-throw for form to handle (e.g., 409 conflict)
      }
    }
  }, []);

  /**
   * Update an existing deck with optimistic update
   */
  const handleUpdateDeck = useCallback(
    async (id: string, command: UpdateDeckCommand) => {
      // Store previous state for rollback
      const previousDecks = decks;

      try {
        // Optimistic update
        setDecks((prev) => prev.map((deck) => (deck.id === id ? { ...deck, name: command.name } : deck)));

        const updatedDeck = await updateDeck(id, command);

        // Replace with actual data from server
        setDecks((prev) => prev.map((deck) => (deck.id === id ? updatedDeck : deck)));

        toast.success("Deck updated successfully");
      } catch (err) {
        // Rollback on error
        setDecks(previousDecks);

        if (err instanceof Error) {
          toast.error(err.message || "Failed to update deck");
          throw err; // Re-throw for form to handle
        }
      }
    },
    [decks]
  );

  /**
   * Delete a deck with optimistic update
   */
  const handleDeleteDeck = useCallback(
    async (id: string) => {
      // Store previous state for rollback
      const previousDecks = decks;
      const previousPagination = pagination;

      try {
        // Optimistic update
        setDecks((prev) => prev.filter((deck) => deck.id !== id));

        const response = await deleteDeck(id);

        // Update pagination total
        setPagination((prev) => ({
          ...prev,
          total: prev.total - 1,
          total_pages: Math.ceil((prev.total - 1) / prev.limit),
        }));

        toast.success(`Deck deleted successfully. ${response.deleted_flashcards} flashcard(s) removed.`);

        // Note: If this was the last deck on the page and not page 1,
        // the UI will handle loading the previous page
      } catch (err) {
        // Rollback on error
        setDecks(previousDecks);
        setPagination(previousPagination);

        if (err instanceof Error) {
          toast.error(err.message || "Failed to delete deck");
        }
      }
    },
    [decks, pagination]
  );

  /**
   * Load a specific page of decks
   */
  const loadPage = useCallback(
    async (page: number) => {
      // Validate page within bounds
      const clampedPage = Math.max(1, Math.min(page, pagination.total_pages || 1));

      setIsLoading(true);
      setError(null);

      try {
        const params: DeckListQueryParams = {
          page: clampedPage,
          limit: pagination.limit,
          sort: "created_at",
          order: "desc",
        };

        const response = await listDecks(params);
        setDecks(response.data);
        setPagination(response.pagination);

        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || "Failed to load decks");
          toast.error("Failed to load decks");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [pagination]
  );

  /**
   * Refetch current page
   */
  const refetch = useCallback(async () => {
    await loadPage(pagination.page);
  }, [pagination.page, loadPage]);

  return {
    decks,
    pagination,
    isLoading,
    error,
    createDeck: handleCreateDeck,
    updateDeck: handleUpdateDeck,
    deleteDeck: handleDeleteDeck,
    loadPage,
    refetch,
  };
}
