CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_number" varchar(255) NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"date_of_birth" timestamp NOT NULL,
	"gender" integer NOT NULL,
	"phone_number" varchar(20),
	"emergency_contact" varchar(255),
	"emergency_phone" varchar(20),
	"address" text,
	"medical_history" jsonb,
	"allergies" jsonb,
	"medications" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_patient_number_unique" UNIQUE("patient_number")
);
--> statement-breakpoint
ALTER TABLE "prediction_logs" ADD COLUMN "patient_id" integer;--> statement-breakpoint
ALTER TABLE "prediction_logs" ADD CONSTRAINT "prediction_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;