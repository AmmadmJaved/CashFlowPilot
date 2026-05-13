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

export async function verifyGoogleToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    
    // Debug logging
    console.log("Auth header:", authHeader?.substring(0, 50) + "...");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ 
        message: "Missing or invalid authorization header",
        debug: "Header must start with 'Bearer '"
      });
    }

    const token = authHeader.split(" ")[1];
    
    // Debug logging
    console.log("Token parts:", token?.split('.').length);
    
    if (!token) {
      return res.status(401).json({ 
        message: "No token provided",
        debug: "Token is empty after Bearer prefix"
      });
    }

    // Check if it's an id_token
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

      const [userBySubject] = await db
        .select()
        .from(users)
        .where(eq(users.id, tokenSubject))
        .limit(1);

      const [userByEmail] = tokenEmail
        ? await db.select().from(users).where(eq(users.email, tokenEmail)).limit(1)
        : [];

      const profileUpdate = {
        email: tokenEmail || null,
        firstName: payload.given_name ?? "",
        lastName: payload.family_name ?? "",
        profileImageUrl: payload.picture ?? "",
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };

      let canonicalUserId = tokenSubject;

      if (userBySubject) {
        canonicalUserId = userBySubject.id;
        await db
          .update(users)
          .set(profileUpdate)
          .where(eq(users.id, canonicalUserId));
      } else if (userByEmail) {
        // Keep the existing database user ID so historical personal data remains linked.
        canonicalUserId = userByEmail.id;
        await db
          .update(users)
          .set(profileUpdate)
          .where(eq(users.id, canonicalUserId));
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
        });
      }

      // Attach normalized claims to request so all routes use canonical user ID.
      req.user = {
        claims: {
          ...payload,
          sub: canonicalUserId,
          originalSub: tokenSubject,
        },
      };

      next();
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