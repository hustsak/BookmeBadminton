-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'PLAYER');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('JOINED', 'LEFT');

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "venueId" INTEGER NOT NULL,
    "courtId" INTEGER,
    "bookingId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL DEFAULT 'ALL_LEVELS',
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "format" TEXT DEFAULT 'Doubles',
    "feePerPerson" INTEGER DEFAULT 0,
    "shuttlecockProvided" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'PLAYER',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_bookingId_key" ON "Match"("bookingId");

-- CreateIndex
CREATE INDEX "Match_venueId_idx" ON "Match"("venueId");

-- CreateIndex
CREATE INDEX "Match_creatorId_idx" ON "Match"("creatorId");

-- CreateIndex
CREATE INDEX "Match_date_idx" ON "Match"("date");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_skillLevel_idx" ON "Match"("skillLevel");

-- CreateIndex
CREATE INDEX "MatchParticipant_matchId_idx" ON "MatchParticipant"("matchId");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_idx" ON "MatchParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key" ON "MatchParticipant"("matchId", "userId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
