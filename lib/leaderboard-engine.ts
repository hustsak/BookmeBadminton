import { prisma } from "./prisma";
import { MatchStatus, MatchResultStatus, ReviewModerationStatus, SkillLevel } from "@prisma/client";

export type LeaderboardMetric = "wins" | "winRate" | "rating" | "activity";
export type LeaderboardPeriod = "all-time" | "monthly" | "weekly";

export interface LeaderboardQueryOptions {
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
  venueId?: number;
  skillLevel?: SkillLevel | string;
  page?: number;
  limit?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
  homeVenueName: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageRating: number;
  ratingsCount: number;
  isEligible: boolean;
  scoreDisplay: string;
}

export interface LeaderboardResponse {
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  venueId: number | null;
  skillLevel: string | null;
  criteria: {
    name: string;
    description: string;
    thresholdDescription: string;
    minMatchesRequired: number;
    minReviewsRequired: number;
  };
  disclaimer: string;
  entries: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MIN_MATCHES_FOR_WIN_RATE = 3;
const MIN_REVIEWS_FOR_RATING = 3;

export async function getLeaderboard(options?: LeaderboardQueryOptions): Promise<LeaderboardResponse> {
  const metric: LeaderboardMetric = options?.metric || "wins";
  const period: LeaderboardPeriod = options?.period || "all-time";
  const venueId = options?.venueId ? Number(options.venueId) : null;
  const skillLevel = options?.skillLevel && options.skillLevel !== "ALL" ? options.skillLevel : null;
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 15));

  // Determine period date range
  const now = new Date();
  let periodStartDate: Date | null = null;
  if (period === "weekly") {
    periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "monthly") {
    periodStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 1. Fetch relevant completed matches with confirmed results
  const matchWhere: any = {
    status: MatchStatus.COMPLETED,
    result: {
      status: MatchResultStatus.CONFIRMED,
    },
  };

  if (venueId) {
    matchWhere.venueId = venueId;
  }

  if (periodStartDate) {
    matchWhere.date = { gte: periodStartDate };
  }

  const matches = await prisma.match.findMany({
    where: matchWhere,
    include: {
      result: true,
      venue: {
        select: { id: true, name: true },
      },
    },
  });

  // Aggregate user stats from matches
  interface UserAgg {
    userId: number;
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  }
  const userAggMap = new Map<number, UserAgg>();

  for (const match of matches) {
    const res = match.result;
    if (!res) continue;

    const allPlayerIds = new Set<number>([
      ...(res.team1PlayerIds || []),
      ...(res.team2PlayerIds || []),
    ]);

    for (const pId of allPlayerIds) {
      if (!userAggMap.has(pId)) {
        userAggMap.set(pId, {
          userId: pId,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        });
      }
      const agg = userAggMap.get(pId)!;
      agg.matchesPlayed++;

      if (res.winnerTeam === null || !res.winningPlayerIds || res.winningPlayerIds.length === 0) {
        agg.draws++;
      } else if (res.winningPlayerIds.includes(pId)) {
        agg.wins++;
      } else {
        agg.losses++;
      }
    }
  }

  // 2. Fetch all users who have player profiles (and filter by skill level if specified)
  const profileWhere: any = {};
  if (skillLevel) {
    profileWhere.skillLevel = skillLevel;
  }

  const profiles = await prisma.playerProfile.findMany({
    where: profileWhere,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          receivedReviews: {
            where: {
              moderationStatus: { not: ReviewModerationStatus.REMOVED },
            },
            select: { rating: true },
          },
        },
      },
      homeVenue: {
        select: { name: true },
      },
    },
  });

  // Combine data
  const candidateEntries: LeaderboardEntry[] = [];

  for (const profile of profiles) {
    const uid = profile.userId;
    const agg = userAggMap.get(uid) || {
      userId: uid,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    };

    // Rating calculations
    const reviews = profile.user?.receivedReviews || [];
    const ratingsCount = reviews.length;
    const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = ratingsCount > 0 ? Math.round((ratingSum / ratingsCount) * 10) / 10 : 0;

    const decidedMatches = agg.wins + agg.losses;
    const winRate = decidedMatches > 0 ? Math.round((agg.wins / decidedMatches) * 1000) / 10 : 0;

    let isEligible = true;
    let scoreDisplay = "";

    if (metric === "wins") {
      isEligible = agg.matchesPlayed >= 1;
      scoreDisplay = `${agg.wins} Win${agg.wins === 1 ? "" : "s"}`;
    } else if (metric === "winRate") {
      isEligible = agg.matchesPlayed >= MIN_MATCHES_FOR_WIN_RATE;
      scoreDisplay = isEligible ? `${winRate}%` : `${winRate}% (< ${MIN_MATCHES_FOR_WIN_RATE} matches)`;
    } else if (metric === "rating") {
      isEligible = ratingsCount >= MIN_REVIEWS_FOR_RATING;
      scoreDisplay = isEligible ? `${averageRating} ★ (${ratingsCount})` : `${averageRating} ★ (< ${MIN_REVIEWS_FOR_RATING} reviews)`;
    } else if (metric === "activity") {
      isEligible = agg.matchesPlayed >= 1;
      scoreDisplay = `${agg.matchesPlayed} Match${agg.matchesPlayed === 1 ? "" : "es"}`;
    }

    candidateEntries.push({
      rank: 0,
      userId: uid,
      displayName: profile.displayName || profile.user?.name || `Player #${uid}`,
      avatarUrl: profile.avatarUrl,
      skillLevel: profile.skillLevel,
      homeVenueName: profile.homeVenue?.name || null,
      matchesPlayed: agg.matchesPlayed,
      wins: agg.wins,
      losses: agg.losses,
      draws: agg.draws,
      winRate,
      averageRating,
      ratingsCount,
      isEligible,
      scoreDisplay,
    });
  }

  // 3. Deterministic Sorting with Tie-Breakers
  candidateEntries.sort((a, b) => {
    // 1st priority: Eligibility (Eligible candidates always rank above ineligible)
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;

    if (metric === "wins") {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return a.userId - b.userId;
    }

    if (metric === "winRate") {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return a.userId - b.userId;
    }

    if (metric === "rating") {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      if (b.ratingsCount !== a.ratingsCount) return b.ratingsCount - a.ratingsCount;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      return a.userId - b.userId;
    }

    if (metric === "activity") {
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return a.userId - b.userId;
    }

    return a.userId - b.userId;
  });

  // Assign deterministic rank
  candidateEntries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  // 4. Server-side pagination
  const total = candidateEntries.length;
  const skip = (page - 1) * limit;
  const paginatedEntries = candidateEntries.slice(skip, skip + limit);

  // Criteria descriptions
  const criteriaMap: Record<LeaderboardMetric, { name: string; description: string; thresholdDescription: string; minMatchesRequired: number; minReviewsRequired: number }> = {
    wins: {
      name: "Most Wins",
      description: "Ranked by total confirmed match victories.",
      thresholdDescription: "At least 1 completed match required.",
      minMatchesRequired: 1,
      minReviewsRequired: 0,
    },
    winRate: {
      name: "Highest Win Rate",
      description: "Ranked by victory percentage across decided matches.",
      thresholdDescription: `Minimum threshold of ${MIN_MATCHES_FOR_WIN_RATE} completed matches required to prevent 1-match skew.`,
      minMatchesRequired: MIN_MATCHES_FOR_WIN_RATE,
      minReviewsRequired: 0,
    },
    rating: {
      name: "Top Rated Players",
      description: "Ranked by verified peer sportsmanship reviews.",
      thresholdDescription: `Minimum threshold of ${MIN_REVIEWS_FOR_RATING} reviews required for verified leaderboard ranking.`,
      minMatchesRequired: 0,
      minReviewsRequired: MIN_REVIEWS_FOR_RATING,
    },
    activity: {
      name: "Most Active",
      description: "Ranked by total completed community matches.",
      thresholdDescription: "At least 1 completed match required.",
      minMatchesRequired: 1,
      minReviewsRequired: 0,
    },
  };

  return {
    metric,
    period,
    venueId,
    skillLevel: skillLevel || null,
    criteria: criteriaMap[metric],
    disclaimer: "Rankings are calculated dynamically from verified community matches on BookMeBadminton and are not an official badminton federation rating.",
    entries: paginatedEntries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
