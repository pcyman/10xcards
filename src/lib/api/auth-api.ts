/**
 * Authentication API client
 * Handles logout and token refresh operations
 */

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
 * Logout the current user
 * Calls the logout API endpoint and clears localStorage
 */
export async function logout(): Promise<void> {
  const token = getAuthToken();

  if (token) {
    try {
      // Call logout endpoint to invalidate refresh token on server
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Ignore errors - we'll clear localStorage regardless
      console.error("Logout API call failed:", error);
    }
  }

  // Clear localStorage
  localStorage.removeItem("session");

  // Redirect to login page
  window.location.href = "/login";
}

/**
 * Refresh the current session
 * Uses the refresh token to get a new access token
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const sessionStr = localStorage.getItem("session");
    if (!sessionStr) return false;

    const session = JSON.parse(sessionStr);
    if (!session.refresh_token) return false;

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: session.refresh_token,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // Update session in localStorage
    localStorage.setItem("session", JSON.stringify(data.session));

    return true;
  } catch (error) {
    console.error("Session refresh failed:", error);
    return false;
  }
}
