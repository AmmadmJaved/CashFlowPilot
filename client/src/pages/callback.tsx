// pages/Callback.tsx
import { useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { User } from "oidc-client-ts";
import { getClientId } from "@/AuthProvider";

export default function CallbackPage() {
  const auth = useAuth();
  const { isAuthenticated, isLoading, error } = auth;
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!exchanging && !isLoading) return;

    const timer = window.setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 3);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exchanging, isLoading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const isMobileBridgePath = window.location.pathname === "/auth/google/mobile-callback";
    const inNativeShell = Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios";

    // If callback lands in external browser, bounce back into app first.
    if (!inNativeShell && isMobileBridgePath && code && state) {
      window.location.replace(`cashpilot://callback${window.location.search}${window.location.hash}`);
      return;
    }

    // Server-side code exchange for web SPA
    if (!inNativeShell && code && !isAuthenticated && !exchanging) {
      setExchanging(true);
      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      fetch("/api/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      })
        .then((res) => {
          if (!res.ok) return res.json().then((d) => Promise.reject(d));
          return res.json();
        })
        .then((tokenData) => {
          // Store as OIDC user in localStorage so react-oidc-context picks it up
          const idToken = tokenData.id_token;
          if (!idToken) {
            setExchangeError("No id_token in response");
            return;
          }

          const claims = JSON.parse(atob(idToken.split(".")[1]));
          const now = Math.floor(Date.now() / 1000);
          const authority = "https://accounts.google.com";
          const clientId = getClientId();

          const user = new User({
            id_token: idToken,
            access_token: tokenData.access_token || idToken,
            token_type: "Bearer",
            scope: tokenData.scope || "openid profile email",
            expires_at: claims.exp || now + 3600,
            profile: {
              sub: claims.sub,
              exp: claims.exp || now + 3600,
              iat: claims.iat || now,
              email: claims.email,
              name: claims.name,
              given_name: claims.given_name,
              family_name: claims.family_name,
              picture: claims.picture,
              iss: claims.iss || authority,
              aud: claims.aud || clientId,
            },
          });

          const key = `oidc.user:${authority}:${clientId}`;
          window.localStorage.setItem(key, user.toStorageString());

          // Pre-seed optimistic profile in localStorage so dashboard renders instantly
          const optimisticProfile = {
            userId: claims.sub,
            publicName: claims.name || claims.email?.split('@')[0] || 'User',
            email: claims.email,
            currency: 'PKR',
            language: 'en',
            timezone: 'Asia/Karachi',
            dateFormat: 'DD/MM/YYYY',
            numberFormat: 'en-PK',
            theme: 'light',
            notifications: true,
            emailNotifications: false,
          };
          localStorage.setItem('cashpilot_optimistic_profile', JSON.stringify(optimisticProfile));
          localStorage.setItem('cashpilot_optimistic_user', JSON.stringify({
            id: claims.sub,
            email: claims.email,
            firstName: claims.given_name || '',
            lastName: claims.family_name || '',
            profileImageUrl: claims.picture || '',
            profile: optimisticProfile,
          }));

          // Navigate to home — full reload picks up stored user
          window.location.href = "/";
        })
        .catch((err) => {
          console.error("Token exchange error:", err);
          setExchangeError(err?.message || "Token exchange failed");
          setExchanging(false);
        });
    }
  }, []);

  if (exchanging || isLoading) {
    const loadingMessages = [
      "Verifying Google sign-in...",
      "Creating secure session...",
      "Syncing profile and dashboard...",
    ];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 shadow-2xl shadow-cyan-900/20">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-cyan-400/40 border-t-cyan-300" />
            <div>
              <p className="text-lg font-semibold text-cyan-200">Getting your account ready</p>
              <p className="text-sm text-slate-300">You will be redirected automatically.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            {loadingMessages[loadingStep]}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full ${step <= loadingStep ? "bg-cyan-400" : "bg-slate-700"}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (exchangeError) return <div className="min-h-screen flex items-center justify-center"><p>Login error: {exchangeError}</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><p>Login error: {error.message}</p></div>;

  if (isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  return <div className="min-h-screen flex items-center justify-center"><p>Login failed or not authenticated</p></div>;
}
// This page handles the OIDC callback after authentication
