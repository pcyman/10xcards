import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DeckListSkeletonProps {
  count?: number;
}

/**
 * Loading skeleton that mimics the deck grid layout
 * Shows placeholder cards while data is being fetched
 */
export function DeckListSkeleton({ count = 6 }: DeckListSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter className="gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-9 ml-auto" />
            <Skeleton className="h-9 w-9" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
