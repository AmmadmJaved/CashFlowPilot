import { OAuth2Client } from "google-auth-library";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

const getAllowedGoogleClientIds = () => {
  const clientIds = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter((value): value is string => Boolean(value && value.trim()));

  if (clientIds.length === 0) {
    throw new Error("GOOGLE_CLIENT_ID (and optionally GOOGLE_ANDROID_CLIENT_ID) must be set");
  }

  return clientIds;
};

const allowedGoogleClientIds = getAllowedGoogleClientIds();
const client = new OAuth2Client();

// In-memory token cache: token hash → { claims, expiresAt }
// Avoids repeated Google verification + DB writes for the same token.
const tokenCache = new Map<string, { claims: Record<string, any>; expiresAt: number }>();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TOKEN_CACHE_MAX = 500;

function getTokenHash(token: string): string {
  // Use last 32 chars of token as a fast cache key (unique per token)
  return token.slice(-32);
}

function pruneTokenCache() {
  if (tokenCache.size <= TOKEN_CACHE_MAX) return;
  const now = Date.now();
  for (const [key, entry] of tokenCache) {
    if (entry.expiresAt < now) tokenCache.delete(key);
  }
  // If still too large, drop oldest half
  if (tokenCache.size > TOKEN_CACHE_MAX) {
    const keys = Array.from(tokenCache.keys());
    for (let i = 0; i < keys.length / 2; i++) tokenCache.delete(keys[i]);
  }
}

export async function verifyGoogleToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ 
        message: "Missing or invalid authorization header",
        debug: "Header must start with 'Bearer '"
      });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: "No token provided",
        debug: "Token is empty after Bearer prefix"
      });
    }

    // Fast path: check in-memory cache first
    const cacheKey = getTokenHash(token);
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = { claims: cached.claims };
      return next();
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: allowedGoogleClientIds,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const tokenSubject = payload.sub;
      const tokenEmail = payload.email ?? "";

      if (!tokenSubject) {
        return res.status(401).json({ message: "Invalid token payload: missing subject" });
      }

      const claims = {
        ...payload,
        sub: tokenSubject,
        originalSub: tokenSubject,
      };

      // Cache the verified result immediately
      pruneTokenCache();
      tokenCache.set(cacheKey, {
        claims,
        expiresAt: Date.now() + TOKEN_CACHE_TTL,
      });

      req.user = { claims };
      next();

      // Fire-and-forget: ensure user exists in DB (don't block the response)
      setImmediate(async () => {
        try {
          const [existing] = await db.select().from(users).where(eq(users.id, tokenSubject)).limit(1);
          if (existing) {
            // Only update lastLoginAt if stale (>30 min)
            const lastLogin = existing.lastLoginAt ? new Date(existing.lastLoginAt).getTime() : 0;
            if (Date.now() - lastLogin > 30 * 60 * 1000) {
              await db.update(users).set({
                email: tokenEmail || null,
                firstName: payload.given_name ?? "",
                lastName: payload.family_name ?? "",
                profileImageUrl: payload.picture ?? "",
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              }).where(eq(users.id, tokenSubject));
            }
          } else {
            await db.insert(users).values({
              id: tokenSubject,
              email: tokenEmail || null,
              firstName: payload.given_name ?? "",
              lastName: payload.family_name ?? "",
              profileImageUrl: payload.picture ?? "",
              role: "user",
              status: "active",
              lastLoginAt: new Date(),
            }).onConflictDoNothing();
          }
        } catch (e) {
          console.error("Background user sync error:", e);
        }
      });
    } catch (tokenError) {
      console.error("Token verification failed:", tokenError);
      return res.status(401).json({ 
        message: "Invalid token",
        debug: typeof tokenError === "object" && tokenError && "message" in tokenError ? (tokenError as any).message : String(tokenError)
      });
    }
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
}