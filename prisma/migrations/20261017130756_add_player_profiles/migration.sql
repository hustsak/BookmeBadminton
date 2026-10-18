-- CreateEnum
CREATE TYPE "PlayerSkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "PlayingStyle" AS ENUM ('SINGLES', 'DOUBLES', 'BOTH');

-- CreateEnum
CREATE TYPE "PlayHand" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "skillLevel" "PlayerSkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "playingStyle" "PlayingStyle" NOT NULL DEFAULT 'BOTH',
    "playHand" "PlayHand" NOT NULL DEFAULT 'RIGHT',
    "preferredDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTimeStart" TEXT DEFAULT '18:00',
    "preferredTimeEnd" TEXT DEFAULT '21:00',
    "homeVenueId" INTEGER,
    "preferredVenueIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "bio" TEXT,
    "yearsExperience" INTEGER DEFAULT 1,
    "city" TEXT DEFAULT 'Hanoi',
    "district" TEXT,
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE INDEX "PlayerProfile_skillLevel_idx" ON "PlayerProfile"("skillLevel");

-- CreateIndex
CREATE INDEX "PlayerProfile_playingStyle_idx" ON "PlayerProfile"("playingStyle");

-- CreateIndex
CREATE INDEX "PlayerProfile_homeVenueId_idx" ON "PlayerProfile"("homeVenueId");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_homeVenueId_fkey" FOREIGN KEY ("homeVenueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
