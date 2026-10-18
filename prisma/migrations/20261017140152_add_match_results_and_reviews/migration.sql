-- CreateEnum
CREATE TYPE "MatchResultStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ReviewModerationStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'REMOVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'MATCH_RESULT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_RESULT_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_RESULT_DISPUTED';
ALTER TYPE "NotificationType" ADD VALUE 'PLAYER_RATED';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "submittedById" INTEGER NOT NULL,
    "status" "MatchResultStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "score" TEXT NOT NULL,
    "setScores" JSONB,
    "winnerTeam" INTEGER,
    "team1PlayerIds" INTEGER[],
    "team2PlayerIds" INTEGER[],
    "winningPlayerIds" INTEGER[],
    "confirmedById" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "disputedById" INTEGER,
    "disputedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerReview" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_matchId_key" ON "MatchResult"("matchId");

-- CreateIndex
CREATE INDEX "MatchResult_matchId_idx" ON "MatchResult"("matchId");

-- CreateIndex
CREATE INDEX "MatchResult_status_idx" ON "MatchResult"("status");

-- CreateIndex
CREATE INDEX "MatchResult_submittedById_idx" ON "MatchResult"("submittedById");

-- CreateIndex
CREATE INDEX "PlayerReview_recipientId_moderationStatus_idx" ON "PlayerReview"("recipientId", "moderationStatus");

-- CreateIndex
CREATE INDEX "PlayerReview_reviewerId_idx" ON "PlayerReview"("reviewerId");

-- CreateIndex
CREATE INDEX "PlayerReview_matchId_idx" ON "PlayerReview"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerReview_reviewerId_recipientId_matchId_key" ON "PlayerReview"("reviewerId", "recipientId", "matchId");

-- CreateIndex
CREATE INDEX "ReviewReport_reviewId_idx" ON "ReviewReport"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewReport_reporterId_idx" ON "ReviewReport"("reporterId");

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_disputedById_fkey" FOREIGN KEY ("disputedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerReview" ADD CONSTRAINT "PlayerReview_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerReview" ADD CONSTRAINT "PlayerReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerReview" ADD CONSTRAINT "PlayerReview_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PlayerReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
