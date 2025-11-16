import { Button } from "@/components/ui/button";

interface EmptyDeckStateProps {
  deckId: string;
  onCreateManually: () => void;
}

export function EmptyDeckState({
  deckId,
  onCreateManually,
}: EmptyDeckStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 text-center">
      {/* Icon */}
      <div className="rounded-full bg-muted p-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          This deck has no flashcards yet
        </h2>
        <p className="max-w-md text-muted-foreground">
          Get started by generating flashcards with AI or creating them manually
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          onClick={() => window.location.href = `/decks/${deckId}/generate`}
        >
          Generate with AI
        </Button>
        <Button size="lg" variant="outline" onClick={onCreateManually}>
          Create Manually
        </Button>
      </div>
    </div>
  );
}
