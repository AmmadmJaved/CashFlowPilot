import { User, WebStorageStateStore } from "oidc-client-ts";
import { AuthProvider, AuthProviderProps } from "react-oidc-context";
import { Capacitor } from "@capacitor/core";
import type { SignInResult } from "@capawesome/capacitor-google-sign-in";

export const isNativeRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const platform = Capacitor.getPlatform?.();
  return (
    platform === "android" ||
    platform === "ios"
  );
};

export const getNativeBridgeRedirectUri = () => {
  return import.meta.env.VITE_GOOGLE_NATIVE_REDIRECT_BRIDGE || "https://cashpilot.live/auth/google/mobile-callback";
};

const getWebRedirectUri = () => {
  if (import.meta.env.VITE_GOOGLE_REDIRECT_URI) {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  }
  return `${window.location.origin}/auth/google/callback`;
};

export const getClientId = () => {
  // Use web client for OIDC redirect flow (including native bridge callback).
  // Android client ID is typically used with native Google Sign-In plugins.
  return import.meta.env.VITE_GOOGLE_CLIENT_ID;
};

const getAuthority = () => {
  return import.meta.env.VITE_AUTH_AUTHORITY || "https://accounts.google.com";
};

const parseJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((ch) => `%${(`00${ch.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getOidcStorageKey = () => {
  return `oidc.user:${getAuthority()}:${getClientId()}`;
};

export const storeNativeSignInAsOidcUser = (result: SignInResult) => {
  if (typeof window === "undefined" || !result.idToken) {
    return;
  }

  const claims = parseJwtPayload(result.idToken) || {};
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = typeof claims.exp === "number" ? claims.exp : now + 3600;

  const user = new User({
    id_token: result.idToken,
    access_token: result.accessToken || result.idToken,
    token_type: "Bearer",
    scope: import.meta.env.VITE_GOOGLE_SCOPE || "openid profile email",
    expires_at: expiresAt,
    profile: {
      sub: result.userId || claims.sub || "native-user",
      exp: expiresAt,
      iat: typeof claims.iat === "number" ? claims.iat : now,
      email: result.email || claims.email || undefined,
      name: result.displayName || claims.name || undefined,
      given_name: result.givenName || claims.given_name || undefined,
      family_name: result.familyName || claims.family_name || undefined,
      picture: result.imageUrl || claims.picture || undefined,
      iss: claims.iss || getAuthority(),
      aud: claims.aud || getClientId(),
    },
  });

  window.localStorage.setItem(getOidcStorageKey(), user.toStorageString());
};

const getRedirectUri = (nativeApp: boolean) => {
  if (nativeApp) {
    return getNativeBridgeRedirectUri();
  }

  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  if (isLocalhost) {
    return "http://localhost:5000/auth/google/callback";
  }

  return getWebRedirectUri();
};

export function OidcProvider({ children }: { children: React.ReactNode }) {
  const nativeApp = isNativeRuntime();
  const responseType = import.meta.env.VITE_GOOGLE_RESPONSE_TYPE || "id_token";
  const extraQueryParams =
    responseType === "code"
      ? {
          access_type: "offline",
          prompt: "consent",
        }
      : {
          prompt: "select_account",
        };

  const oidcConfig: AuthProviderProps = {
    authority: getAuthority(),
    client_id: getClientId(),
    redirect_uri: getRedirectUri(nativeApp),
    silent_redirect_uri: nativeApp ? undefined : `${window.location.origin}/silent-callback.html`,
    response_type: responseType,
    scope: import.meta.env.VITE_GOOGLE_SCOPE || "openid profile email",
    extraQueryParams,
    loadUserInfo: true,
    automaticSilentRenew: !nativeApp,
    monitorSession: true,
    // Persist login in localStorage
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  };

  return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
}
