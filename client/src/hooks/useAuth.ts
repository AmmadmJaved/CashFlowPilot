import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

export function useAuthProvider() {
  const auth = useAuth();

  async function fetchUser() {
    if (!auth.user) {
      throw new Error("No authenticated user");
    }

    // Always use id_token for authentication
    const token = auth.user.id_token;
    
    if (!token) {
      throw new Error("No valid token found");
    }

    try {
      const res = await fetch("/api/auth/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Authentication failed");
      }

      return res.json();
    } catch (error) {
      console.error("Auth error:", error);
      throw error;
    }
  }

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user", auth.user?.id_token],
    queryFn: fetchUser,
    retry: false,
    enabled: !!auth.user?.id_token,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}