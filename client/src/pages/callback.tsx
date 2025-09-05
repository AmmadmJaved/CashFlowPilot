// pages/Callback.tsx
import { useAuth } from "react-oidc-context";

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) return <div>Processing login...</div>;

  if (error) return <div>Login error: {error.message}</div>;

  if (isAuthenticated) {
    window.location.href = "/"; // redirect to home
    return null;
  }

  return <div>Login failed or not authenticated</div>;
}
// This page handles the OIDC callback after authentication
