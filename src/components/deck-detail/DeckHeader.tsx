import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { DeckDTO } from "@/types";

interface DeckHeaderProps {
  deck: DeckDTO;
  onUpdateDeckName: (name: string) => Promise<void>;
  onCreateFlashcard: () => void;
  isUpdating?: boolean;
}

export function DeckHeader({
  deck,
  onUpdateDeckName,
  onCreateFlashcard,
  isUpdating = false,
}: DeckHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(deck.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edited name when deck name changes
  useEffect(() => {
    setEditedName(deck.name);
  }, [deck.name]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const validateDeckName = (name: string): string | null => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return "Deck name cannot be empty";
    }

    if (trimmed.length > 255) {
      return "Deck name must be 255 characters or less";
    }

    return null;
  };

  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    const error = validateDeckName(trimmed);

    if (error) {
      setNameError(error);
      return;
    }

    // Check if name actually changed
    if (trimmed === deck.name) {
      setIsEditingName(false);
      setNameError(null);
      return;
    }

    try {
      await onUpdateDeckName(trimmed);
      setIsEditingName(false);
      setNameError(null);
    } catch (err) {
      setNameError("Failed to update deck name");
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(deck.name);
    setNameError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const canStartStudy = deck.cards_due > 0;

  return (
    <div className="mb-8 space-y-4">
      {/* Deck Name */}
      <div>
        {isEditingName ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => {
                  setEditedName(e.target.value);
                  setNameError(null);
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveName}
                disabled={isUpdating}
                className={nameError ? "border-red-500" : ""}
                aria-label="Edit deck name"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              <Button
                variant="outline"
                onClick={handleSaveName}
                disabled={isUpdating}
                aria-label="Save deck name"
              >
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                aria-label="Cancel editing"
              >
                Cancel
              </Button>
            </div>
            {nameError && (
              <p id="name-error" className="text-sm text-red-500">
                {nameError}
              </p>
            )}
          </div>
        ) : (
          <h1
            className="cursor-pointer text-3xl font-bold hover:text-muted-foreground"
            onClick={() => setIsEditingName(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditingName(true);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Deck name: ${deck.name}. Click to edit.`}
          >
            {deck.name}
          </h1>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="secondary" aria-label={`${deck.total_flashcards} total flashcards`}>
          {deck.total_flashcards} {deck.total_flashcards === 1 ? "card" : "cards"}
        </Badge>
        <Badge
          variant={deck.cards_due > 0 ? "default" : "outline"}
          aria-label={`${deck.cards_due} cards due for review`}
        >
          {deck.cards_due} due
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!canStartStudy}
          onClick={() => window.location.href = `/decks/${deck.id}/study`}
          title={!canStartStudy ? "No cards due for review today" : undefined}
          aria-disabled={!canStartStudy}
        >
          Start Study
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.href = `/decks/${deck.id}/generate`}
        >
          Generate with AI
        </Button>
        <Button variant="outline" onClick={onCreateFlashcard}>
          Create Flashcard
        </Button>
      </div>
    </div>
  );
}
