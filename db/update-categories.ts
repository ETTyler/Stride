import { db } from "./client";
import { muscleGroups } from "./schema";
import { eq } from "drizzle-orm";

const CATEGORIES = {
  "Upper Chest": "Chest & Shoulders",
  "Chest": "Chest & Shoulders",
  "Front Delt": "Chest & Shoulders",
  "Side Delt": "Chest & Shoulders",
  "Rear Delt": "Chest & Shoulders",
  "Triceps": "Arms & Forearms",
  "Back": "Back",
  "Biceps": "Arms & Forearms",
  "Forearms": "Arms & Forearms",
  "Abs": "Core",
  "Quads": "Legs",
  "Hamstrings": "Legs",
  "Glutes": "Legs",
  "Calves": "Legs",
};

async function main() {
  for (const [muscle, category] of Object.entries(CATEGORIES)) {
    await db
      .update(muscleGroups)
      .set({ category })
      .where(eq(muscleGroups.name, muscle));
  }
  console.log("Categories updated!");
}

main();
