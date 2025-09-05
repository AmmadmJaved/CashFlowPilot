// auth.ts
import { OAuth2Client } from "google-auth-library";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }

    const token = authHeader.split(" ")[1];
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Attach user to request
    req.user = payload;

    // ✅ Ensure user exists in DB
    const userId = payload.sub; // Google unique user ID
    const email = payload.email ?? "";
    const firstName = payload.given_name ?? "";
    const lastName = payload.family_name ?? "";
    const profileImageUrl = payload.picture ?? "";

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (existing.length === 0) {
      await db.insert(users).values({
        id: userId,   // using Google sub as PK
        email,
        firstName,
        lastName,
        profileImageUrl,
      });
    } else {
      // Optionally update name/email if changed
        const user = existing[0];
          if (
            user.email !== email ||
            user.firstName !== firstName ||
            user.lastName !== lastName ||
            user.profileImageUrl !== profileImageUrl
          ) {
            await db.update(users)
              .set({ email, firstName, lastName, profileImageUrl })
              .where(eq(users.id, userId));
          }
    }

    next();
  } catch (err) {
    console.error("verifyGoogleToken error:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
}
