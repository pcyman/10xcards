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
import type { CreateDeckCommand } from "@/types";

interface CreateDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateDeckCommand) => Promise<void>;
}

/**
 * Modal dialog for creating a new deck
 * Contains form with validation for deck name
 */
export function CreateDeckModal({ open, onOpenChange, onSubmit }: CreateDeckModalProps) {
  const { name, errors, isValid, isSubmitting, setName, handleSubmit, reset } = useDeckForm("", async (deckName) => {
    await onSubmit({ name: deckName });
    onOpenChange(false);
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Deck</DialogTitle>
          <DialogDescription>Give your new flashcard deck a name to get started.</DialogDescription>
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
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
