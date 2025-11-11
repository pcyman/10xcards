import { DeckCard } from "./DeckCard";
import type { DeckDTO } from "@/types";

interface DeckGridProps {
  decks: DeckDTO[];
  onDeckClick: (deckId: string) => void;
  onStartStudy: (deckId: string) => void;
  onEditDeck: (deck: DeckDTO) => void;
  onDeleteDeck: (deck: DeckDTO) => void;
}

/**
 * Responsive grid container for deck cards
 * Renders a grid of DeckCard components
 */
export function DeckGrid({ decks, onDeckClick, onStartStudy, onEditDeck, onDeleteDeck }: DeckGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => (
        <DeckCard
          key={deck.id}
          deck={deck}
          onDeckClick={onDeckClick}
          onStartStudy={onStartStudy}
          onEdit={onEditDeck}
          onDelete={onDeleteDeck}
        />
      ))}
    </div>
  );
}
