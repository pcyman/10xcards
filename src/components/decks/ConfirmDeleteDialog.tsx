import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DeckDTO } from "@/types";

interface ConfirmDeleteDialogProps {
  open: boolean;
  deck: DeckDTO | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deckId: string) => Promise<void>;
}

/**
 * Confirmation dialog for deck deletion
 * Warns user about permanent deletion and shows flashcard count
 */
export function ConfirmDeleteDialog({ open, deck, onOpenChange, onConfirm }: ConfirmDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!deck) return;

    setIsDeleting(true);
    try {
      await onConfirm(deck.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!deck) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Deck?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{deck.name}&quot;? This will permanently remove{" "}
            {deck.total_flashcards} flashcard(s). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
