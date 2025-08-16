import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    retryOnMount: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // If we get a 401 or 404, the user is not authenticated
  const isNotAuthenticated = error && ((error as any).message?.includes('401') || (error as any).message?.includes('404'));

  return {
    user,
    isLoading: isLoading && !isNotAuthenticated,
    isAuthenticated: !!user && !isNotAuthenticated,
  };
}