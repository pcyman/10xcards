import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeckForm } from "@/components/hooks/useDeckForm";
import type { DeckDTO, UpdateDeckCommand } from "@/types";

interface EditDeckModalProps {
  open: boolean;
  deck: DeckDTO | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (deckId: string, command: UpdateDeckCommand) => Promise<void>;
}

/**
 * Modal dialog for editing an existing deck's name
 * Pre-populated with current deck data
 */
export function EditDeckModal({ open, deck, onOpenChange, onSubmit }: EditDeckModalProps) {
  const { name, errors, isValid, isSubmitting, setName, handleSubmit, reset } = useDeckForm(
    deck?.name || "",
    async (deckName) => {
      if (!deck) return;
      await onSubmit(deck.id, { name: deckName });
      onOpenChange(false);
    }
  );

  // Reset form when deck changes or modal opens
  useEffect(() => {
    if (open && deck) {
      setName(deck.name);
    } else if (!open) {
      reset();
    }
  }, [open, deck, setName, reset]);

  if (!deck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Deck</DialogTitle>
          <DialogDescription>Update the name for &quot;{deck.name}&quot;</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Deck Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Spanish Vocabulary"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
