-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationReason" TEXT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND';

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");
