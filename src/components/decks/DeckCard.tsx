import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DeckDTO } from "@/types";

interface DeckCardProps {
  deck: DeckDTO;
  onDeckClick: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onEdit: (deck: DeckDTO) => void;
  onDelete: (deck: DeckDTO) => void;
}

/**
 * Individual deck card component
 * Displays deck name, statistics, and action buttons
 * Highlights cards with due reviews
 */
export function DeckCard({ deck, onDeckClick, onStartStudy, onEdit, onDelete }: DeckCardProps) {
  const hasDueCards = deck.cards_due > 0;

  return (
    <article>
      <Card className={`transition-all hover:shadow-md ${hasDueCards ? "border-blue-500 border-2" : ""}`}>
        <CardHeader>
          <CardTitle
            className="cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onDeckClick(deck.id)}
          >
            {deck.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>{deck.total_flashcards} flashcard(s)</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={hasDueCards ? "default" : "secondary"}>{deck.cards_due} due for review</Badge>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            variant={hasDueCards ? "default" : "outline"}
            size="sm"
            disabled={!hasDueCards}
            onClick={() => onStartStudy(deck.id)}
            title={hasDueCards ? "Start studying" : "No cards due for review"}
          >
            Start Study
          </Button>

          <Button variant="outline" size="sm" onClick={() => onDeckClick(deck.id)}>
            View Deck
          </Button>

          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => onEdit(deck)} aria-label="Edit deck">
            <Pencil className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => onDelete(deck)} aria-label="Delete deck">
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}
