import type { FlashcardDTO } from "@/types";

/**
 * State for controlling the flashcard creation/edit modal
 */
export interface ModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  flashcard?: FlashcardDTO; // Present only in edit mode
}

/**
 * State for controlling the delete confirmation dialog
 */
export interface DeleteConfirmState {
  isOpen: boolean;
  flashcardId: string | null;
  flashcardFront: string | null; // For display in confirmation message
}

/**
 * Form state for flashcard creation/editing
 */
export interface FlashcardFormState {
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
    general?: string;
  };
}

/**
 * Internal state for flashcard list management
 * Used by useDeckFlashcards hook
 */
export interface FlashcardListState {
  flashcards: FlashcardDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  isLoadingMore: boolean;
  hasMore: boolean;
}

/**
 * Internal state for deck info management
 * Used by useDeckInfo hook
 */
export interface DeckInfoState {
  deck: import("@/types").DeckDTO;
  isUpdating: boolean;
}
