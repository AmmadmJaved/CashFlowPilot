import { OAuth2Client } from "google-auth-library";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      // Create or update user record
      const userData = {
        id: payload.sub,
        email: payload.email ?? "",
        firstName: payload.given_name ?? "",
        lastName: payload.family_name ?? "",
        profileImageUrl: payload.picture ?? "",
        lastLoginAt: new Date(),
      };

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.id))
        .execute();

      if (existingUser.length === 0) {
        // Insert new user
        await db.insert(users).values({
          ...userData,
          role: "user",
          status: "active",
        });
      } else {
        // Update existing user
        await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id));
      }

      // Attach user claims to request
      req.user = {
        claims: payload
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