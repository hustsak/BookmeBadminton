import { prisma } from "./prisma";
import { MatchStatus, MatchResultStatus, ParticipantStatus, ReviewModerationStatus } from "@prisma/client";

export interface MatchHistoryItem {
  matchId: number;
  title: string;
  date: Date;
  venueName: string;
  venueLocation: string;
  format: string | null;
  score: string;
  outcome: "WIN" | "LOSS" | "DRAW";
  isHost: boolean;
  partnerNames?: string[];
  opponentNames?: string[];
  completedAt: Date | null;
}

export interface MonthlyTrendItem {
  month: string; // YYYY-MM
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface VenueStatItem {
  venueId: number;
  venueName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface PlayerStatistics {
  userId: number;
  matchesPlayed: number;
  matchesHosted: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // percentage 0 - 100
  currentStreak: {
    type: "WIN" | "LOSS" | "NONE";
    count: number;
    label: string; // e.g. "3W", "2L", "-"
  };
  bestWinStreak: number;
  averageRating: number;
  ratingsCount: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentMatches: MatchHistoryItem[];
  monthlyTrends: MonthlyTrendItem[];
  venueStats: VenueStatItem[];
}

/**
 * Calculates comprehensive player statistics based on persisted confirmed match results.
 * Excludes pending, cancelled, or disputed match results.
 */
export async function getPlayerStatistics(userId: number): Promise<PlayerStatistics> {
  // 1. Fetch user to ensure existence
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // 2. Fetch all COMPLETED matches where user was a participant or submitter
  // and result is CONFIRMED
  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.COMPLETED,
      result: {
        status: MatchResultStatus.CONFIRMED,
      },
      OR: [
        {
          participants: {
            some: {
              userId,
              status: ParticipantStatus.JOINED,
            },
          },
        },
        {
          result: {
            OR: [
              { team1PlayerIds: { has: userId } },
              { team2PlayerIds: { has: userId } },
            ],
          },
        },
      ],
    },
    include: {
      result: true,
      venue: {
        select: { id: true, name: true, location: true },
      },
      participants: {
        where: { status: ParticipantStatus.JOINED },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { date: "asc" },
      { completedAt: "asc" },
      { id: "asc" },
    ],
  });

  // Count hosted matches
  const matchesHosted = await prisma.match.count({
    where: {
      creatorId: userId,
      status: MatchStatus.COMPLETED,
      result: {
        status: MatchResultStatus.CONFIRMED,
      },
    },
  });

  // Calculate wins, losses, draws, streaks
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let currentStreakType: "WIN" | "LOSS" | "NONE" = "NONE";
  let currentStreakCount = 0;
  let bestWinStreak = 0;
  let runningWinStreak = 0;

  const monthlyMap = new Map<string, { matches: number; wins: number; losses: number }>();
  const venueMap = new Map<number, { name: string; matches: number; wins: number; losses: number }>();
  const historyItems: MatchHistoryItem[] = [];

  for (const match of matches) {
    const result = match.result;
    if (!result) continue;

    const inTeam1 = result.team1PlayerIds.includes(userId);
    const inTeam2 = result.team2PlayerIds.includes(userId);
    const isPlayerInResult = inTeam1 || inTeam2;

    // Determine outcome for this player
    let outcome: "WIN" | "LOSS" | "DRAW" = "DRAW";

    if (result.winnerTeam === null || !result.winningPlayerIds || result.winningPlayerIds.length === 0) {
      outcome = "DRAW";
      draws++;
      // Draw doesn't increase win streak, but doesn't necessarily break it unless strict
      runningWinStreak = 0;
      currentStreakType = "NONE";
      currentStreakCount = 0;
    } else if (result.winningPlayerIds.includes(userId)) {
      outcome = "WIN";
      wins++;
      runningWinStreak++;
      if (runningWinStreak > bestWinStreak) {
        bestWinStreak = runningWinStreak;
      }
      if (currentStreakType === "WIN") {
        currentStreakCount++;
      } else {
        currentStreakType = "WIN";
        currentStreakCount = 1;
      }
    } else if (isPlayerInResult) {
      outcome = "LOSS";
      losses++;
      runningWinStreak = 0;
      if (currentStreakType === "LOSS") {
        currentStreakCount++;
      } else {
        currentStreakType = "LOSS";
        currentStreakCount = 1;
      }
    } else {
      // User is a participant on the match record but not on either team (e.g. spectator/reserve)
      continue;
    }

    // Monthly trends
    const matchDate = match.date ? new Date(match.date) : new Date();
    const monthKey = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, "0")}`;
    const mData = monthlyMap.get(monthKey) || { matches: 0, wins: 0, losses: 0 };
    mData.matches++;
    if (outcome === "WIN") mData.wins++;
    if (outcome === "LOSS") mData.losses++;
    monthlyMap.set(monthKey, mData);

    // Venue breakdown
    if (match.venue) {
      const vData = venueMap.get(match.venue.id) || { name: match.venue.name, matches: 0, wins: 0, losses: 0 };
      vData.matches++;
      if (outcome === "WIN") vData.wins++;
      if (outcome === "LOSS") vData.losses++;
      venueMap.set(match.venue.id, vData);
    }

    // Partner & Opponent names
    const myTeamIds = inTeam1 ? result.team1PlayerIds : result.team2PlayerIds;
    const opponentTeamIds = inTeam1 ? result.team2PlayerIds : result.team1PlayerIds;

    const partnerNames: string[] = [];
    const opponentNames: string[] = [];

    for (const p of match.participants) {
      const pName = p.user?.profile?.displayName || p.user?.name || `Player #${p.userId}`;
      if (myTeamIds.includes(p.userId) && p.userId !== userId) {
        partnerNames.push(pName);
      } else if (opponentTeamIds.includes(p.userId)) {
        opponentNames.push(pName);
      }
    }

    historyItems.push({
      matchId: match.id,
      title: match.title,
      date: match.date,
      venueName: match.venue?.name || "Unknown Venue",
      venueLocation: match.venue?.location || "",
      format: match.format,
      score: result.score,
      outcome,
      isHost: match.creatorId === userId,
      partnerNames,
      opponentNames,
      completedAt: match.completedAt,
    });
  }

  const matchesPlayed = wins + losses + draws;
  const decidedMatches = wins + losses;
  const winRate = decidedMatches > 0 ? Math.round((wins / decidedMatches) * 1000) / 10 : 0;

  // Streak label
  const streakLabel =
    currentStreakType === "WIN"
      ? `${currentStreakCount}W`
      : currentStreakType === "LOSS"
      ? `${currentStreakCount}L`
      : "-";

  // Ratings calculation
  const reviews = await prisma.playerReview.findMany({
    where: {
      recipientId: userId,
      moderationStatus: { not: ReviewModerationStatus.REMOVED },
    },
    select: { rating: true },
  });

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  for (const rev of reviews) {
    if (rev.rating >= 1 && rev.rating <= 5) {
      ratingDistribution[rev.rating as 1 | 2 | 3 | 4 | 5]++;
      ratingSum += rev.rating;
    }
  }

  const ratingsCount = reviews.length;
  const averageRating = ratingsCount > 0 ? Math.round((ratingSum / ratingsCount) * 10) / 10 : 0;

  // Monthly trends sorted
  const monthlyTrends: MonthlyTrendItem[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const dec = data.wins + data.losses;
      return {
        month,
        matchesPlayed: data.matches,
        wins: data.wins,
        losses: data.losses,
        winRate: dec > 0 ? Math.round((data.wins / dec) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month)); // Latest months first

  // Venue statistics
  const venueStats: VenueStatItem[] = Array.from(venueMap.entries()).map(([venueId, data]) => {
    const dec = data.wins + data.losses;
    return {
      venueId,
      venueName: data.name,
      matchesPlayed: data.matches,
      wins: data.wins,
      losses: data.losses,
      winRate: dec > 0 ? Math.round((data.wins / dec) * 1000) / 10 : 0,
    };
  });

  // Return recent matches descending (newest first)
  const recentMatches = historyItems.reverse().slice(0, 10);

  return {
    userId,
    matchesPlayed,
    matchesHosted,
    wins,
    losses,
    draws,
    winRate,
    currentStreak: {
      type: currentStreakType,
      count: currentStreakCount,
      label: streakLabel,
    },
    bestWinStreak,
    averageRating,
    ratingsCount,
    ratingDistribution,
    recentMatches,
    monthlyTrends,
    venueStats,
  };
}
