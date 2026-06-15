import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as schema from "./schema";

// In Next.js, env files are already loaded. When this runs from a CLI script
// (e.g. `tsx db/seed.ts`), they aren't — so load .env.local / .env on demand.
if (!process.env.DATABASE_URL) {
  config({ path: ".env.local" });
  config();
}

// Neon's HTTP driver — ideal for serverless / edge, no connection pooling headaches.
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
