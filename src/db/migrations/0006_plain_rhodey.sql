ALTER TABLE "patients" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "patients" CASCADE;--> statement-breakpoint
ALTER TABLE "prediction_logs" DROP COLUMN "patient_id";