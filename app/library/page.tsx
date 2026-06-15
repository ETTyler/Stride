import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listExercises, listMuscles } from "@/lib/actions/library";
import LibraryClient from "./LibraryClient";

export const dynamic = "force-dynamic";

/**
 * Exercise library. Server-fetches the catalog + muscle list and hands them to
 * the client screen, which creates new exercises via the library server action.
 */
export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const [exercises, muscles] = await Promise.all([listExercises(), listMuscles()]);
  return <LibraryClient exercises={exercises} muscles={muscles} />;
}
