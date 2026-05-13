import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
dotenv.config(); // make sure env variables are loaded before anything else

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // keep connections warm
  idleTimeoutMillis: 60000, // keep idle connections for 60s (prevents cold starts)
  connectionTimeoutMillis: 5000,
});

// Keep the pool warm — prevents Neon serverless cold start latency
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch {}
}, 30000); // ping every 30 seconds

// Optional: Test DB connection (without ending pool)
async function testDbConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful");
    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}
testDbConnection();
export const db = drizzle({ client: pool, schema });