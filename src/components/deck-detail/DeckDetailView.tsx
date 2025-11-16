import { useState, useCallback, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeckHeader } from "./DeckHeader";
import { FlashcardList } from "./FlashcardList";
import { EmptyDeckState } from "./EmptyDeckState";
import { FlashcardModal } from "./FlashcardModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeckFlashcards } from "@/components/hooks/useDeckFlashcards";
import { useDeckInfo } from "@/components/hooks/useDeckInfo";
import type { DeckDTO, FlashcardDTO, PaginatedResponseDTO } from "@/types";
import type { ModalState, DeleteConfirmState } from "@/lib/types/deck-view.types";

interface DeckDetailViewProps {
  initialDeck: DeckDTO | null;
  initialFlashcards: PaginatedResponseDTO<FlashcardDTO> | null;
  deckId: string;
}

export function DeckDetailView({
  initialDeck,
  initialFlashcards,
  deckId,
}: DeckDetailViewProps) {
  const [isLoading, setIsLoading] = useState(!initialDeck || !initialFlashcards);
  const [deck, setDeck] = useState<DeckDTO | null>(initialDeck);
  const [flashcardsData, setFlashcardsData] =
    useState<PaginatedResponseDTO<FlashcardDTO> | null>(initialFlashcards);

  // Check authentication and fetch data if not available from SSR
  useEffect(() => {
    const session = localStorage.getItem("session");
    if (!session) {
      window.location.href = "/login";
      return;
    }

    // If data not provided by SSR, fetch client-side
    if (!initialDeck || !initialFlashcards) {
      fetchInitialData();
    }
  }, []);

  const fetchInitialData = async () => {
    const session = localStorage.getItem("session");
    if (!session) return;

    const sessionData = JSON.parse(session);
    const token = sessionData.access_token;

    try {
      // Fetch deck details
      const deckResponse = await fetch(`/api/decks/${deckId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (deckResponse.status === 404) {
        window.location.href = "/404";
        return;
      }

      if (!deckResponse.ok) {
        throw new Error("Failed to fetch deck");
      }

      const deckData: DeckDTO = await deckResponse.json();
      setDeck(deckData);

      // Fetch initial flashcards
      const flashcardsResponse = await fetch(
        `/api/decks/${deckId}/flashcards?page=1&limit=50&sort=created_at&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!flashcardsResponse.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const flashcardsData: PaginatedResponseDTO<FlashcardDTO> =
        await flashcardsResponse.json();
      setFlashcardsData(flashcardsData);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load deck data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading skeleton while fetching data
  if (isLoading || !deck || !flashcardsData) {
    return (
      <>
        <Toaster />
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 space-y-4">
            <Skeleton className="h-10 w-64" />
            <div className="flex gap-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </>
    );
  }

  return <DeckDetailViewContent deck={deck} flashcardsData={flashcardsData} deckId={deckId} />;
}

interface DeckDetailViewContentProps {
  deck: DeckDTO;
  flashcardsData: PaginatedResponseDTO<FlashcardDTO>;
  deckId: string;
}

function DeckDetailViewContent({ deck, flashcardsData, deckId }: DeckDetailViewContentProps) {
  // Custom hooks for data management
  const { deck: deckState, isUpdating, updateDeckName } = useDeckInfo(deck);
  const {
    flashcards,
    pagination,
    isLoadingMore,
    hasMore,
    loadMore,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
  } = useDeckFlashcards(deckId, flashcardsData);

  // Modal state management
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: "create",
    flashcard: undefined,
  });

  const [deleteConfirmState, setDeleteConfirmState] =
    useState<DeleteConfirmState>({
      isOpen: false,
      flashcardId: null,
      flashcardFront: null,
    });

  // Modal handlers
  const handleOpenCreateModal = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: "create",
      flashcard: undefined,
    });
  }, []);

  const handleOpenEditModal = useCallback((flashcard: FlashcardDTO) => {
    setModalState({
      isOpen: true,
      mode: "edit",
      flashcard,
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: "create",
      flashcard: undefined,
    });
  }, []);

  // Delete confirmation handlers
  const handleOpenDeleteConfirm = useCallback(
    (flashcardId: string, flashcardFront: string) => {
      setDeleteConfirmState({
        isOpen: true,
        flashcardId,
        flashcardFront,
      });
    },
    [],
  );

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmState({
      isOpen: false,
      flashcardId: null,
      flashcardFront: null,
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmState.flashcardId) return;

    try {
      await deleteFlashcard(deleteConfirmState.flashcardId);
      setDeleteConfirmState({
        isOpen: false,
        flashcardId: null,
        flashcardFront: null,
      });
      toast.success("Flashcard deleted");
    } catch (error) {
      console.error("Failed to delete flashcard:", error);
      toast.error("Failed to delete flashcard. Please try again.");
    }
  }, [deleteConfirmState.flashcardId, deleteFlashcard]);

  // Wrapped handlers with toast notifications
  const handleCreateFlashcard = useCallback(
    async (command: import("@/types").CreateFlashcardCommand) => {
      try {
        await createFlashcard(command);
        toast.success("Flashcard created");
      } catch (error) {
        toast.error("Failed to create flashcard. Please try again.");
        throw error;
      }
    },
    [createFlashcard],
  );

  const handleUpdateFlashcard = useCallback(
    async (id: string, command: import("@/types").UpdateFlashcardCommand) => {
      try {
        await updateFlashcard(id, command);
        toast.success("Flashcard updated");
      } catch (error) {
        toast.error("Failed to update flashcard. Please try again.");
        throw error;
      }
    },
    [updateFlashcard],
  );

  const handleUpdateDeckName = useCallback(
    async (name: string) => {
      try {
        await updateDeckName(name);
        toast.success("Deck name updated");
      } catch (error) {
        toast.error("Failed to update deck name. Please try again.");
        throw error;
      }
    },
    [updateDeckName],
  );

  return (
    <>
      <Toaster />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <a href="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Back to Decks
            </a>
          </Button>
        </div>

        {/* Deck Header */}
        <DeckHeader
          deck={deckState}
          onUpdateDeckName={handleUpdateDeckName}
          onCreateFlashcard={handleOpenCreateModal}
          isUpdating={isUpdating}
        />

        {/* Conditional: Empty State or Flashcard List */}
        {flashcards.length === 0 ? (
          <EmptyDeckState
            deckId={deckId}
            onCreateManually={handleOpenCreateModal}
          />
        ) : (
          <FlashcardList
            flashcards={flashcards}
            pagination={pagination}
            onLoadMore={loadMore}
            onEditFlashcard={handleOpenEditModal}
            onDeleteFlashcard={handleOpenDeleteConfirm}
            isLoadingMore={isLoadingMore}
          />
        )}

        {/* Flashcard Modal (Create/Edit) */}
        <FlashcardModal
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          flashcard={modalState.flashcard}
          onClose={handleCloseModal}
          onCreate={handleCreateFlashcard}
          onUpdate={handleUpdateFlashcard}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmState.isOpen}
          title="Delete Flashcard"
          description={
            deleteConfirmState.flashcardFront
              ? `Are you sure you want to delete "${deleteConfirmState.flashcardFront.slice(0, 50)}${deleteConfirmState.flashcardFront.length > 50 ? "..." : ""}"? This action cannot be undone.`
              : "Are you sure you want to delete this flashcard? This action cannot be undone."
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDestructive
        />
      </div>
    </>
  );
}
