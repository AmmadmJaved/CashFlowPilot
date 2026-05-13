import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

// Read optimistic user data cached during login callback for instant UI
function getOptimisticUser() {
  try {
    const raw = localStorage.getItem('cashpilot_optimistic_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return undefined;
}

export function useAuthProvider() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  async function fetchUser() {
    if (!auth.user) {
      throw new Error("No authenticated user");
    }

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

      const data = await res.json();

      // Seed the profile cache so useProfile() doesn't fire a separate request
      if (data.profile) {
        queryClient.setQueryData(['/api/profile'], data.profile);
        // Clear optimistic data now that real data is loaded
        localStorage.removeItem('cashpilot_optimistic_user');
        localStorage.removeItem('cashpilot_optimistic_profile');
      }

      return data;
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
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // Use optimistic data as placeholder so UI renders instantly
    placeholderData: () => getOptimisticUser(),
  });

  return {
    user,
    isLoading: isLoading && !user, // Not loading if we have placeholder data
    error,
    isAuthenticated: !!user,
  };
}