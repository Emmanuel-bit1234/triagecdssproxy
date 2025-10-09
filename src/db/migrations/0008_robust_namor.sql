ALTER TABLE "patients" ALTER COLUMN "gender" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "phone_number" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "emergency_contact" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "insurance_info" jsonb;--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "emergency_phone";