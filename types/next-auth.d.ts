import type { DefaultSession } from "next-auth";

/**
 * Add `id` to the session user. We set it in the `session` callback in auth.ts,
 * and the whole app scopes data to `session.user.id`, so it must be typed.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
