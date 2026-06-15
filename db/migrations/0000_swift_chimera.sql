CREATE TYPE "public"."meso_status" AS ENUM('planned', 'active', 'complete');--> statement-breakpoint
CREATE TYPE "public"."muscle_role" AS ENUM('PRIMARY', 'SECONDARY');--> statement-breakpoint
CREATE TYPE "public"."workload_rating" AS ENUM('easy', 'moderate', 'hard', 'too_much');--> statement-breakpoint
CREATE TYPE "public"."workout_status" AS ENUM('upcoming', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "account" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "day_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"exercise_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "days" (
	"id" serial PRIMARY KEY NOT NULL,
	"mesocycle_id" integer NOT NULL,
	"label" text NOT NULL,
	"day_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_muscles" (
	"exercise_id" integer NOT NULL,
	"muscle_group_id" integer NOT NULL,
	"role" "muscle_role" DEFAULT 'PRIMARY' NOT NULL,
	CONSTRAINT "exercise_muscles_exercise_id_muscle_group_id_pk" PRIMARY KEY("exercise_id","muscle_group_id")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text,
	"name" text NOT NULL,
	"notes" text,
	"video_url" text,
	"rep_range_low" integer DEFAULT 8 NOT NULL,
	"rep_range_high" integer DEFAULT 12 NOT NULL,
	"load_step" real DEFAULT 2.5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"muscle_group_id" integer NOT NULL,
	"pump" integer DEFAULT 1 NOT NULL,
	"soreness" integer DEFAULT 1 NOT NULL,
	"joint_pain" integer DEFAULT 0 NOT NULL,
	"workload" "workload_rating" DEFAULT 'moderate' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mesocycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text,
	"name" text NOT NULL,
	"weeks" integer DEFAULT 5 NOT NULL,
	"status" "meso_status" DEFAULT 'planned' NOT NULL,
	"start_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "muscle_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"mev" integer DEFAULT 8 NOT NULL,
	"mav" integer DEFAULT 16 NOT NULL,
	"mrv" integer DEFAULT 22 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"day_exercise_id" integer NOT NULL,
	"set_number" integer NOT NULL,
	"target_reps" integer,
	"target_rir" integer,
	"target_weight" real,
	"weight" real,
	"reps" integer,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_email_token_pk" PRIMARY KEY("email","token")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"mesocycle_id" integer NOT NULL,
	"day_id" integer NOT NULL,
	"week_number" integer NOT NULL,
	"date" timestamp DEFAULT now(),
	"status" "workout_status" DEFAULT 'upcoming' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_exercises" ADD CONSTRAINT "day_exercises_day_id_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_exercises" ADD CONSTRAINT "day_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "days" ADD CONSTRAINT "days_mesocycle_id_mesocycles_id_fk" FOREIGN KEY ("mesocycle_id") REFERENCES "public"."mesocycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_group_id_muscle_groups_id_fk" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_muscle_group_id_muscle_groups_id_fk" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesocycles" ADD CONSTRAINT "mesocycles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_day_exercise_id_day_exercises_id_fk" FOREIGN KEY ("day_exercise_id") REFERENCES "public"."day_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_mesocycle_id_mesocycles_id_fk" FOREIGN KEY ("mesocycle_id") REFERENCES "public"."mesocycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_day_id_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."days"("id") ON DELETE no action ON UPDATE no action;