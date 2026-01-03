/*
  Warnings:

  - You are about to drop the column `address` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `expMonth` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `expYear` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `end` on the `WorkingHour` table. All the data in the column will be lost.
  - You are about to drop the column `open` on the `WorkingHour` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `WorkingHour` table. All the data in the column will be lost.
  - Added the required column `addressLine1` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiryMonth` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiryYear` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'SUV', 'HATCHBACK', 'COMMERCIAL', 'OTHER');

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "address",
ADD COLUMN     "addressLine1" TEXT NOT NULL,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "postalCode" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "plate" TEXT,
ADD COLUMN     "time" TEXT NOT NULL,
ADD COLUMN     "vehicleType" "VehicleType";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "expMonth",
DROP COLUMN "expYear",
ADD COLUMN     "expiryMonth" INTEGER NOT NULL,
ADD COLUMN     "expiryYear" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "addons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vehicleType" "VehicleType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkingHour" DROP COLUMN "end",
DROP COLUMN "open",
DROP COLUMN "start",
ADD COLUMN     "breakEnd" TEXT,
ADD COLUMN     "breakStart" TEXT,
ADD COLUMN     "closeTime" TEXT,
ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "openTime" TEXT;

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_businessId_key" ON "Favorite"("userId", "businessId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
