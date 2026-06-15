import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit (unlike Next.js) does not auto-load .env.local. Load it first,
// then fall back to .env. dotenv won't overwrite vars that are already set.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
