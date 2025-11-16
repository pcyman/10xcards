import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  FlashcardDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
} from "@/types";
import type { FlashcardFormState } from "@/lib/types/deck-view.types";

interface FlashcardModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  flashcard?: FlashcardDTO;
  onClose: () => void;
  onCreate?: (command: CreateFlashcardCommand) => Promise<void>;
  onUpdate?: (id: string, command: UpdateFlashcardCommand) => Promise<void>;
}

export function FlashcardModal({
  isOpen,
  mode,
  flashcard,
  onClose,
  onCreate,
  onUpdate,
}: FlashcardModalProps) {
  const [formState, setFormState] = useState<FlashcardFormState>({
    front: flashcard?.front || "",
    back: flashcard?.back || "",
    errors: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or flashcard changes
  useEffect(() => {
    if (isOpen) {
      setFormState({
        front: flashcard?.front || "",
        back: flashcard?.back || "",
        errors: {},
      });
    }
  }, [isOpen, flashcard]);

  const validate = (): boolean => {
    const errors: FlashcardFormState["errors"] = {};

    if (!formState.front.trim()) {
      errors.front = "Front text cannot be empty or whitespace-only";
    }

    if (!formState.back.trim()) {
      errors.back = "Back text cannot be empty or whitespace-only";
    }

    if (mode === "edit" && flashcard) {
      const hasChanges =
        formState.front.trim() !== flashcard.front ||
        formState.back.trim() !== flashcard.back;

      if (!hasChanges && !errors.front && !errors.back) {
        errors.general = "No changes detected";
      }
    }

    setFormState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (mode === "create" && onCreate) {
        await onCreate({
          front: formState.front.trim(),
          back: formState.back.trim(),
        });
      } else if (mode === "edit" && onUpdate && flashcard) {
        await onUpdate(flashcard.id, {
          front: formState.front.trim(),
          back: formState.back.trim(),
        });
      }

      onClose();
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        errors: {
          general:
            error instanceof Error
              ? error.message
              : "Failed to save flashcard",
        },
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: "front" | "back", value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: undefined,
        general: undefined,
      },
    }));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Flashcard" : "Edit Flashcard"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new flashcard by entering the front and back text."
              : "Edit the flashcard front and back text."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Front Field */}
          <div className="space-y-2">
            <Label htmlFor="front">Front *</Label>
            <Textarea
              id="front"
              value={formState.front}
              onChange={(e) => handleFieldChange("front", e.target.value)}
              placeholder="Enter the question or prompt"
              rows={4}
              disabled={isSubmitting}
              aria-invalid={!!formState.errors.front}
              aria-describedby={
                formState.errors.front ? "front-error" : undefined
              }
            />
            {formState.errors.front && (
              <p id="front-error" className="text-sm text-red-500">
                {formState.errors.front}
              </p>
            )}
          </div>

          {/* Back Field */}
          <div className="space-y-2">
            <Label htmlFor="back">Back *</Label>
            <Textarea
              id="back"
              value={formState.back}
              onChange={(e) => handleFieldChange("back", e.target.value)}
              placeholder="Enter the answer"
              rows={4}
              disabled={isSubmitting}
              aria-invalid={!!formState.errors.back}
              aria-describedby={formState.errors.back ? "back-error" : undefined}
            />
            {formState.errors.back && (
              <p id="back-error" className="text-sm text-red-500">
                {formState.errors.back}
              </p>
            )}
          </div>

          {/* General Error */}
          {formState.errors.general && (
            <p className="text-sm text-red-500">{formState.errors.general}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
