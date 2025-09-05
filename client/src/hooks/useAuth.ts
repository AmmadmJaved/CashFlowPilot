import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

export function useAuthProvider() {

const auth = useAuth();
  async function fetchUser() {
    const token = auth.user?.id_token; // or access_token depending on your config
    const res = await fetch("/api/auth/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  }

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => fetchUser(),
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
