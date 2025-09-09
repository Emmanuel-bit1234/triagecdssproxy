CREATE TABLE "prediction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"inputs" jsonb NOT NULL,
	"predict" integer NOT NULL,
	"ktas_explained" jsonb NOT NULL,
	"probs" jsonb NOT NULL,
	"model" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prediction_logs" ADD CONSTRAINT "prediction_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;