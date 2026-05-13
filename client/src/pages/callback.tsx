// pages/Callback.tsx
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const isMobileBridgePath = window.location.pathname === "/auth/google/mobile-callback";
    const inNativeShell = Capacitor.isNativePlatform() || (window as any).Capacitor !== undefined;

    // If callback lands in external browser, bounce back into app first.
    if (!inNativeShell && isMobileBridgePath && code && state) {
      window.location.replace(`cashpilot://callback${window.location.search}${window.location.hash}`);
      return;
    }

    console.log("OAuth callback received", {
      codePresent: Boolean(code),
      statePresent: Boolean(state),
      isMobileBridgePath,
      inNativeShell,
      href: window.location.href,
    });
  }, []);

  if (isLoading) return <div>Processing login...</div>;

  if (error) return <div>Login error: {error.message}</div>;

  if (isAuthenticated) {
    window.location.href = "/"; // redirect to home
    return null;
  }

  return <div>Login failed or not authenticated</div>;
}
// This page handles the OIDC callback after authentication
