import { Button } from "@/components/ui/button";

interface LoadMoreButtonProps {
  onLoadMore: () => Promise<void>;
  isLoading: boolean;
  remaining: number;
  hasMore: boolean;
}

export function LoadMoreButton({
  onLoadMore,
  isLoading,
  remaining,
  hasMore,
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className="mt-6 flex justify-center">
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={`Load more flashcards. ${remaining} remaining.`}
      >
        {isLoading ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            Loading...
          </>
        ) : (
          `Load More (${remaining} remaining)`
        )}
      </Button>
    </div>
  );
}
