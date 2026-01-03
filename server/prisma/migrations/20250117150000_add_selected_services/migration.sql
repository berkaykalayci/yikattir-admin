-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "selectedServices" JSONB;

