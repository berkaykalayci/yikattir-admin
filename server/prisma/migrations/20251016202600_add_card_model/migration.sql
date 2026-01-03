/*
  Warnings:

  - The `status` column on the `Appointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `body` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `expiryMonth` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `expiryYear` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `last4` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `breakEnd` on the `WorkingHour` table. All the data in the column will be lost.
  - You are about to drop the column `breakStart` on the `WorkingHour` table. All the data in the column will be lost.
  - Made the column `plate` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `vehicleType` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `message` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleType` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "plate" SET NOT NULL,
DROP COLUMN "vehicleType",
ADD COLUMN     "vehicleType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "slotIntervalMin" INTEGER NOT NULL DEFAULT 30,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "capacity" SET DEFAULT 3;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "body",
ADD COLUMN     "message" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "brand",
DROP COLUMN "expiryMonth",
DROP COLUMN "expiryYear",
DROP COLUMN "last4",
ADD COLUMN     "details" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "addons" DROP DEFAULT,
DROP COLUMN "vehicleType",
ADD COLUMN     "vehicleType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkingHour" DROP COLUMN "breakEnd",
DROP COLUMN "breakStart",
ALTER COLUMN "isOpen" DROP DEFAULT;

-- DropEnum
DROP TYPE "public"."AppointmentStatus";

-- DropEnum
DROP TYPE "public"."VehicleType";

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "cvv" TEXT NOT NULL,
    "cardHolder" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_userId_key" ON "PushToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
