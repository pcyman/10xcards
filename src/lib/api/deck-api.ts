import type {
  DeckDTO,
  CreateDeckCommand,
  UpdateDeckCommand,
  DeleteDeckResponseDTO,
  PaginatedResponseDTO,
  DeckListQueryParams,
} from "@/types";

/**
 * Get authentication token from localStorage
 * Returns the token value or null if not found
 */
function getAuthToken(): string | null {
  try {
    const sessionStr = localStorage.getItem("session");
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr);
    return session.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper with authentication and error handling
 * Automatically redirects to login on 401 errors
 * Throws error with message from API response on failure
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();

  if (!token) {
    window.location.href = "/login";
    throw new Error("No authentication token found");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }

  return response;
}

/**
 * List decks with pagination and sorting
 * GET /api/decks
 */
export async function listDecks(params: DeckListQueryParams = {}): Promise<PaginatedResponseDTO<DeckDTO>> {
  const queryString = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString();

  const response = await fetchWithAuth(`/api/decks?${queryString}`);
  return response.json();
}

/**
 * Create a new deck
 * POST /api/decks
 */
export async function createDeck(command: CreateDeckCommand): Promise<DeckDTO> {
  const response = await fetchWithAuth("/api/decks", {
    method: "POST",
    body: JSON.stringify(command),
  });

  return response.json();
}

/**
 * Update an existing deck
 * PATCH /api/decks/:id
 */
export async function updateDeck(id: string, command: UpdateDeckCommand): Promise<DeckDTO> {
  const response = await fetchWithAuth(`/api/decks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(command),
  });

  return response.json();
}

/**
 * Delete a deck
 * DELETE /api/decks/:id
 */
export async function deleteDeck(id: string): Promise<DeleteDeckResponseDTO> {
  const response = await fetchWithAuth(`/api/decks/${id}`, {
    method: "DELETE",
  });

  return response.json();
}
