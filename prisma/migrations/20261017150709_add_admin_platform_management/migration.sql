-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "ReviewReport" ADD COLUMN     "actionTaken" TEXT,
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformName" TEXT NOT NULL DEFAULT 'BookMeBadminton',
    "contactEmail" TEXT NOT NULL DEFAULT 'support@bookmebadminton.com',
    "contactPhone" TEXT NOT NULL DEFAULT '+84 901 234 567',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'VND',
    "cancellationPolicy" TEXT NOT NULL DEFAULT 'Free cancellation up to 6 hours before slot start time.',
    "minBookingDuration" INTEGER NOT NULL DEFAULT 1,
    "maxBookingDuration" INTEGER NOT NULL DEFAULT 4,
    "defaultMaxMatchPlayers" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ReviewReport_status_idx" ON "ReviewReport"("status");

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformConfig" ADD CONSTRAINT "PlatformConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
