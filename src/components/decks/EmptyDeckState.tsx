import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyDeckStateProps {
  onCreateClick: () => void;
}

/**
 * Empty state component shown when user has no decks
 * Provides friendly messaging and prominent CTA to create first deck
 */
export function EmptyDeckState({ onCreateClick }: EmptyDeckStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        <FolderOpen className="h-24 w-24 text-muted-foreground opacity-50" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">No Decks Yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Welcome! Create your first deck to get started with your flashcard learning journey.
      </p>
      <Button size="lg" onClick={onCreateClick}>
        Create Your First Deck
      </Button>
    </div>
  );
}
