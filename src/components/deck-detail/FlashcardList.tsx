import { useCallback } from "react";
import { FlashcardListItem } from "./FlashcardListItem";
import { LoadMoreButton } from "./LoadMoreButton";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlashcardDTO, PaginationDTO } from "@/types";

interface FlashcardListProps {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
  onLoadMore: () => Promise<void>;
  onEditFlashcard: (flashcard: FlashcardDTO) => void;
  onDeleteFlashcard: (id: string, front: string) => void;
  isLoadingMore: boolean;
}

export function FlashcardList({
  flashcards,
  pagination,
  onLoadMore,
  onEditFlashcard,
  onDeleteFlashcard,
  isLoadingMore,
}: FlashcardListProps) {
  const hasMore = pagination.page < pagination.total_pages;
  const remaining = pagination.total - flashcards.length;

  const handleEdit = useCallback(
    (flashcard: FlashcardDTO) => {
      onEditFlashcard(flashcard);
    },
    [onEditFlashcard],
  );

  const handleDelete = useCallback(
    (id: string, front: string) => {
      onDeleteFlashcard(id, front);
    },
    [onDeleteFlashcard],
  );

  return (
    <div>
      <ul className="space-y-4" role="list" aria-label="Flashcards">
        {flashcards.map((flashcard) => (
          <FlashcardListItem
            key={flashcard.id}
            flashcard={flashcard}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </ul>

      {isLoadingMore && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      <LoadMoreButton
        onLoadMore={onLoadMore}
        isLoading={isLoadingMore}
        remaining={remaining}
        hasMore={hasMore}
      />
    </div>
  );
}
