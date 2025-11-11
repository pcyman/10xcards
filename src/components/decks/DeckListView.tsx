import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, LogOut } from "lucide-react";
import { useDeckList } from "@/components/hooks/useDeckList";
import { DeckGrid } from "./DeckGrid";
import { DeckListSkeleton } from "./DeckListSkeleton";
import { EmptyDeckState } from "./EmptyDeckState";
import { CreateDeckModal } from "./CreateDeckModal";
import { EditDeckModal } from "./EditDeckModal";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { logout } from "@/lib/api/auth-api";
import type { DeckDTO, PaginationDTO } from "@/types";

interface DeckListViewProps {
  initialDecks?: DeckDTO[];
  initialPagination?: PaginationDTO;
}

/**
 * Main client-side React component for deck list view
 * Manages state and orchestrates all CRUD operations
 */
export function DeckListView({ initialDecks, initialPagination }: DeckListViewProps = {}) {
  // Check authentication on mount
  useEffect(() => {
    const session = localStorage.getItem("session");
    if (!session) {
      window.location.href = "/login";
    }
  }, []);

  const { decks, pagination, isLoading, error, createDeck, updateDeck, deleteDeck, loadPage } = useDeckList(
    initialDecks || [],
    initialPagination || { page: 1, limit: 20, total: 0, total_pages: 0 }
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<DeckDTO | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<DeckDTO | null>(null);

  // Navigation handlers
  const handleDeckClick = (deckId: string) => {
    window.location.href = `/decks/${deckId}`;
  };

  const handleStartStudy = (deckId: string) => {
    window.location.href = `/decks/${deckId}/study`;
  };

  // Modal handlers
  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (deck: DeckDTO) => {
    setEditingDeck(deck);
  };

  const handleDeleteClick = (deck: DeckDTO) => {
    setDeletingDeck(deck);
  };

  // Pagination helpers
  const renderPaginationItems = () => {
    const items = [];
    const { page, total_pages } = pagination;

    // Show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink onClick={() => loadPage(1)} isActive={page === 1}>
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Show ellipsis if needed
    if (page > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Show pages around current page
    for (let i = Math.max(2, page - 1); i <= Math.min(total_pages - 1, page + 1); i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => loadPage(i)} isActive={page === i}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Show ellipsis if needed
    if (page < total_pages - 2) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Show last page
    if (total_pages > 1) {
      items.push(
        <PaginationItem key={total_pages}>
          <PaginationLink onClick={() => loadPage(total_pages)} isActive={page === total_pages}>
            {total_pages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Decks</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <Button onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              Create Deck
            </Button>
          </div>
        </header>

        {/* Error Banner */}
        {error && !isLoading && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-6">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadPage(pagination.page)} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <DeckListSkeleton />
        ) : decks.length === 0 ? (
          <EmptyDeckState onCreateClick={handleCreateClick} />
        ) : (
          <>
            <DeckGrid
              decks={decks}
              onDeckClick={handleDeckClick}
              onStartStudy={handleStartStudy}
              onEditDeck={handleEditClick}
              onDeleteDeck={handleDeleteClick}
            />

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => loadPage(pagination.page - 1)}
                        className={pagination.page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {renderPaginationItems()}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => loadPage(pagination.page + 1)}
                        className={
                          pagination.page === pagination.total_pages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateDeckModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onSubmit={createDeck} />

      <EditDeckModal
        open={editingDeck !== null}
        deck={editingDeck}
        onOpenChange={(open) => !open && setEditingDeck(null)}
        onSubmit={updateDeck}
      />

      <ConfirmDeleteDialog
        open={deletingDeck !== null}
        deck={deletingDeck}
        onOpenChange={(open) => !open && setDeletingDeck(null)}
        onConfirm={deleteDeck}
      />

      {/* Toast Notifications */}
      <Toaster />
    </>
  );
}
