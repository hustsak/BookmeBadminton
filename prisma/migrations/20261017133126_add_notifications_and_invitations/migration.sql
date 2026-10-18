-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_CONFIRMED', 'MATCH_INVITATION', 'MATCH_JOINED', 'MATCH_LEFT', 'MATCH_CANCELLED', 'MATCH_REMINDER', 'PLAYER_CONNECTION_REQUEST', 'PLAYER_CONNECTION_ACCEPTED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "idempotencyKey" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bookingUpdates" BOOLEAN NOT NULL DEFAULT true,
    "matchUpdates" BOOLEAN NOT NULL DEFAULT true,
    "reminders" BOOLEAN NOT NULL DEFAULT true,
    "social" BOOLEAN NOT NULL DEFAULT true,
    "emailChannel" BOOLEAN NOT NULL DEFAULT false,
    "pushChannel" BOOLEAN NOT NULL DEFAULT false,
    "smsChannel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchInvitation" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "MatchInvitation_recipientId_status_idx" ON "MatchInvitation"("recipientId", "status");

-- CreateIndex
CREATE INDEX "MatchInvitation_matchId_idx" ON "MatchInvitation"("matchId");

-- CreateIndex
CREATE INDEX "MatchInvitation_senderId_idx" ON "MatchInvitation"("senderId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchInvitation" ADD CONSTRAINT "MatchInvitation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchInvitation" ADD CONSTRAINT "MatchInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchInvitation" ADD CONSTRAINT "MatchInvitation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
