import { memo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FlashcardDTO } from "@/types";

interface FlashcardListItemProps {
  flashcard: FlashcardDTO;
  onEdit: (flashcard: FlashcardDTO) => void;
  onDelete: (id: string, front: string) => void;
}

const TRUNCATE_LENGTH = 200;

function FlashcardListItemComponent({
  flashcard,
  onEdit,
  onDelete,
}: FlashcardListItemProps) {
  const shouldTruncate = (text: string) => text.length > TRUNCATE_LENGTH;
  const truncate = (text: string) =>
    shouldTruncate(text) ? text.slice(0, TRUNCATE_LENGTH) + "..." : text;

  const wasEdited =
    new Date(flashcard.updated_at) > new Date(flashcard.created_at);

  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <li>
      <Card className="group relative">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Front */}
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  Front
                </span>
                {flashcard.is_ai_generated && (
                  <Badge variant="secondary" aria-label="AI-generated flashcard">
                    AI
                  </Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words">
                {truncate(flashcard.front)}
              </p>
            </div>

            {/* Back */}
            <div>
              <div className="mb-1 text-sm font-semibold text-muted-foreground">
                Back
              </div>
              <p className="whitespace-pre-wrap break-words">
                {truncate(flashcard.back)}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t pt-4">
          {/* Metadata */}
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>Created {formatRelativeDate(flashcard.created_at)}</span>
            {wasEdited && (
              <span>Edited {formatRelativeDate(flashcard.updated_at)}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100 md:opacity-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(flashcard)}
              aria-label={`Edit flashcard: ${flashcard.front}`}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(flashcard.id, flashcard.front)}
              aria-label={`Delete flashcard: ${flashcard.front}`}
            >
              Delete
            </Button>
          </div>
        </CardFooter>
      </Card>
    </li>
  );
}

export const FlashcardListItem = memo(FlashcardListItemComponent);
