import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  boolean,
  pgEnum,
  primaryKey,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ---------- auth ---------- */

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

/* ---------- enums ---------- */

export const muscleRole = pgEnum("muscle_role", ["PRIMARY", "SECONDARY"]);
export const mesoStatus = pgEnum("meso_status", ["planned", "active", "complete"]);
export const workoutStatus = pgEnum("workout_status", ["upcoming", "in_progress", "done"]);
export const workloadRating = pgEnum("workload_rating", ["easy", "moderate", "hard", "too_much"]);

/* ---------- catalog ---------- */

export const muscleGroups = pgTable("muscle_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "chest", "side_delt", "biceps"
  category: text("category").notNull().default("Other"), // "Upper Body", "Lower Body", etc.
  // recoverable-volume landmarks, in working sets per week
  mev: integer("mev").notNull().default(8), // minimum effective volume
  mav: integer("mav").notNull().default(16), // maximum adaptive volume
  mrv: integer("mrv").notNull().default(22), // maximum recoverable volume
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null = shared catalog exercise
  name: text("name").notNull(),
  notes: text("notes"),
  videoUrl: text("video_url"),
  repRangeLow: integer("rep_range_low").notNull().default(8),
  repRangeHigh: integer("rep_range_high").notNull().default(12),
  // smallest load increment available for this lift (kg). Dumbbells jump more.
  loadStep: real("load_step").notNull().default(2.5),
});

// many-to-many: an exercise hits muscles as primary or secondary mover
export const exerciseMuscles = pgTable(
  "exercise_muscles",
  {
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    muscleGroupId: integer("muscle_group_id")
      .notNull()
      .references(() => muscleGroups.id, { onDelete: "cascade" }),
    role: muscleRole("role").notNull().default("PRIMARY"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.exerciseId, t.muscleGroupId] }) })
);

/* ---------- the plan ---------- */

export const mesocycles = pgTable("mesocycles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weeks: integer("weeks").notNull().default(5), // includes the deload week
  status: mesoStatus("status").notNull().default("planned"),
  startDate: timestamp("start_date").defaultNow(),
});

export const days = pgTable("days", {
  id: serial("id").primaryKey(),
  mesocycleId: integer("mesocycle_id")
    .notNull()
    .references(() => mesocycles.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "Push A"
  dayOrder: integer("day_order").notNull(),
});

// which exercises live on which day, and in what order
export const dayExercises = pgTable("day_exercises", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id")
    .notNull()
    .references(() => days.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  exerciseOrder: integer("exercise_order").notNull(),
});

/* ---------- the log ---------- */

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  mesocycleId: integer("mesocycle_id")
    .notNull()
    .references(() => mesocycles.id, { onDelete: "cascade" }),
  dayId: integer("day_id")
    .notNull()
    .references(() => days.id),
  weekNumber: integer("week_number").notNull(),
  date: timestamp("date").defaultNow(),
  status: workoutStatus("status").notNull().default("upcoming"),
});

export const setLogs = pgTable("set_logs", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  dayExerciseId: integer("day_exercise_id")
    .notNull()
    .references(() => dayExercises.id),
  setNumber: integer("set_number").notNull(),
  targetReps: integer("target_reps"),
  targetRir: integer("target_rir"),
  targetWeight: real("target_weight"),
  weight: real("weight"), // what was actually lifted
  reps: integer("reps"),
  completed: boolean("completed").notNull().default(false),
});

// per muscle group, captured at the start of the next session for that muscle
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  muscleGroupId: integer("muscle_group_id")
    .notNull()
    .references(() => muscleGroups.id),
  pump: integer("pump").notNull().default(1), // 0-3
  soreness: integer("soreness").notNull().default(1), // 0-3 (0 = healed early)
  jointPain: integer("joint_pain").notNull().default(0), // 0-3
  workload: workloadRating("workload").notNull().default("moderate"),
});

/* ---------- relations (optional, handy for queries) ---------- */

export const exercisesRelations = relations(exercises, ({ many }) => ({
  muscles: many(exerciseMuscles),
}));

export const exerciseMusclesRelations = relations(exerciseMuscles, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseMuscles.exerciseId],
    references: [exercises.id],
  }),
  muscle: one(muscleGroups, {
    fields: [exerciseMuscles.muscleGroupId],
    references: [muscleGroups.id],
  }),
}));
