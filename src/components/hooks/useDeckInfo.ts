import { useState } from "react";
import type { DeckDTO } from "@/types";

interface UseDeckInfoReturn {
  deck: DeckDTO;
  isUpdating: boolean;
  updateDeckName: (name: string) => Promise<void>;
  refreshDeck: () => Promise<void>;
}

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const session = localStorage.getItem("session");
  if (!session) {
    throw new Error("No session found");
  }

  const sessionData = JSON.parse(session);
  return {
    Authorization: `Bearer ${sessionData.access_token}`,
  };
}

export function useDeckInfo(initialDeck: DeckDTO): UseDeckInfoReturn {
  const [deck, setDeck] = useState(initialDeck);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateDeckName = async (name: string) => {
    const prevDeck = { ...deck };

    // Optimistic update
    setDeck((prev) => ({ ...prev, name, updated_at: new Date().toISOString() }));
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to update deck name");

      const updated: DeckDTO = await response.json();
      setDeck(updated);
    } catch (error) {
      // Rollback
      setDeck(prevDeck);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshDeck = async () => {
    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to refresh deck");

      const updated: DeckDTO = await response.json();
      setDeck(updated);
    } catch (error) {
      console.error("Failed to refresh deck:", error);
    }
  };

  return { deck, isUpdating, updateDeckName, refreshDeck };
}
