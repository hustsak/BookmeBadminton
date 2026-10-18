-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- DropIndex
DROP INDEX "Booking_courtId_bookingDate_startTime_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingCode" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" TEXT DEFAULT 'VIETQR',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "pricePerHour" INTEGER;

-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "surface" TEXT DEFAULT 'Taraflex Pro Turf';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "address" TEXT,
ADD COLUMN     "closeTime" TEXT NOT NULL DEFAULT '23:00',
ADD COLUMN     "openTime" TEXT NOT NULL DEFAULT '06:00',
ADD COLUMN     "ownerId" INTEGER;

-- CreateTable
CREATE TABLE "MaintenanceBlock" (
    "id" SERIAL NOT NULL,
    "courtId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionRef" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'VIETQR',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceBlock_courtId_date_idx" ON "MaintenanceBlock"("courtId", "date");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Venue_ownerId_idx" ON "Venue"("ownerId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceBlock" ADD CONSTRAINT "MaintenanceBlock_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
