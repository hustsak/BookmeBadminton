import { prisma } from "@/lib/prisma";
import {
  PlayerSkillLevel,
  PlayingStyle,
  PlayHand,
  MatchStatus,
  SkillLevel,
} from "@prisma/client";
import { formatSkillLevel } from "./match-engine";

export interface CompatibilityWeights {
  skill: number;
  availability: number;
  venue: number;
  style: number;
}

export const DEFAULT_WEIGHTS: CompatibilityWeights = {
  skill: 0.40,
  availability: 0.25,
  venue: 0.20,
  style: 0.15,
};

export const SKILL_NUMERIC: Record<PlayerSkillLevel, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
  PROFESSIONAL: 3,
};

export const VALID_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface PlayerStats {
  matchesPlayed: number;
  matchesHosted: number;
  completedMatches: number;
}

export interface CompatibilityResult {
  score: number; // 0 to 100
  breakdown: {
    skillScore: number;
    availabilityScore: number;
    venueScore: number;
    styleScore: number;
  };
  reasons: string[];
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
  skillLevel?: PlayerSkillLevel;
  playingStyle?: PlayingStyle;
  playHand?: PlayHand;
  preferredDays?: string[];
  preferredTimeStart?: string | null;
  preferredTimeEnd?: string | null;
  homeVenueId?: number | null;
  preferredVenueIds?: number[];
  bio?: string | null;
  yearsExperience?: number | null;
  city?: string | null;
  district?: string | null;
  isProfileComplete?: boolean;
}

/**
 * Normalizes day strings to uppercase
 */
export function normalizeDay(day: string): string {
  const d = day.trim().toUpperCase();
  if (d.startsWith("MON")) return "MONDAY";
  if (d.startsWith("TUE")) return "TUESDAY";
  if (d.startsWith("WED")) return "WEDNESDAY";
  if (d.startsWith("THU")) return "THURSDAY";
  if (d.startsWith("FRI")) return "FRIDAY";
  if (d.startsWith("SAT")) return "SATURDAY";
  if (d.startsWith("SUN")) return "SUNDAY";
  return d;
}

/**
 * Calculates Skill Level compatibility score (0 to 100)
 */
export function calculateSkillCompatibility(
  levelA: PlayerSkillLevel,
  levelB: PlayerSkillLevel
): { score: number; reason: string } {
  const numA = SKILL_NUMERIC[levelA] ?? 1;
  const numB = SKILL_NUMERIC[levelB] ?? 1;
  const diff = Math.abs(numA - numB);

  if (diff === 0) {
    return {
      score: 100,
      reason: `Exact skill tier match: Both are ${levelA.toLowerCase()}`,
    };
  } else if (diff === 1) {
    return {
      score: 75,
      reason: `Balanced sparring levels: ${levelA.toLowerCase()} and ${levelB.toLowerCase()}`,
    };
  } else if (diff === 2) {
    return {
      score: 35,
      reason: `Moderate skill difference (${levelA.toLowerCase()} vs ${levelB.toLowerCase()})`,
    };
  } else {
    return {
      score: 10,
      reason: `Wide skill gap (${levelA.toLowerCase()} vs ${levelB.toLowerCase()})`,
    };
  }
}

/**
 * Calculates Availability overlap score (0 to 100)
 */
export function calculateAvailabilityCompatibility(
  daysA: string[] = [],
  daysB: string[] = [],
  timeStartA?: string | null,
  timeEndA?: string | null,
  timeStartB?: string | null,
  timeEndB?: string | null
): { score: number; reason?: string } {
  const normDaysA = (daysA || []).map(normalizeDay);
  const normDaysB = (daysB || []).map(normalizeDay);

  let dayScore = 70; // default flexibility if either profile lists no days
  const sharedDays = normDaysA.filter((d) => normDaysB.includes(d));

  if (normDaysA.length > 0 && normDaysB.length > 0) {
    if (sharedDays.length > 0) {
      const minLen = Math.min(normDaysA.length, normDaysB.length);
      dayScore = Math.min(100, Math.round((sharedDays.length / minLen) * 100));
    } else {
      dayScore = 0;
    }
  }

  // Time overlap
  let timeScore = 80;
  const sA = timeStartA || "18:00";
  const eA = timeEndA || "21:00";
  const sB = timeStartB || "18:00";
  const eB = timeEndB || "21:00";

  // Check overlap: sA < eB and eA > sB
  if (sA < eB && eA > sB) {
    timeScore = 100;
  } else {
    timeScore = 30;
  }

  const combined = Math.round(dayScore * 0.6 + timeScore * 0.4);

  let reason: string | undefined;
  if (sharedDays.length > 0) {
    const formattedDays = sharedDays
      .map((d) => d.charAt(0) + d.slice(1).toLowerCase())
      .join(", ");
    reason = `Overlapping schedule on ${formattedDays}`;
  } else if (normDaysA.length === 0 || normDaysB.length === 0) {
    reason = "Flexible playing schedule";
  }

  return { score: combined, reason };
}

/**
 * Calculates Venue & Location compatibility score (0 to 100)
 */
export function calculateVenueCompatibility(
  venueA?: { homeVenueId?: number | null; preferredVenueIds?: number[]; district?: string | null; venueName?: string } | null,
  venueB?: { homeVenueId?: number | null; preferredVenueIds?: number[]; district?: string | null; venueName?: string } | null
): { score: number; reason?: string } {
  if (!venueA || !venueB) {
    return { score: 50, reason: "Same city (Hanoi)" };
  }

  // 1. Same home venue
  if (venueA.homeVenueId && venueB.homeVenueId && venueA.homeVenueId === venueB.homeVenueId) {
    return {
      score: 100,
      reason: `Shared home court at ${venueA.venueName || "preferred club"}`,
    };
  }

  // 2. Cross-matching preferred venues
  const listA = [venueA.homeVenueId, ...(venueA.preferredVenueIds || [])].filter(Boolean) as number[];
  const listB = [venueB.homeVenueId, ...(venueB.preferredVenueIds || [])].filter(Boolean) as number[];
  const sharedVenues = listA.filter((id) => listB.includes(id));

  if (sharedVenues.length > 0) {
    return {
      score: 85,
      reason: "Plays at common preferred venues",
    };
  }

  // 3. Shared district
  if (
    venueA.district &&
    venueB.district &&
    venueA.district.trim().toLowerCase() === venueB.district.trim().toLowerCase()
  ) {
    return {
      score: 65,
      reason: `Both active in ${venueA.district} district`,
    };
  }

  return {
    score: 30,
    reason: "Badminton players in Hanoi area",
  };
}

/**
 * Calculates Playing Style compatibility score (0 to 100)
 */
export function calculateStyleCompatibility(
  styleA: PlayingStyle,
  styleB: PlayingStyle
): { score: number; reason?: string } {
  if (styleA === PlayingStyle.BOTH && styleB === PlayingStyle.BOTH) {
    return { score: 100, reason: "Versatile players (Singles & Doubles)" };
  }
  if (styleA === styleB) {
    return { score: 100, reason: `Both prefer ${styleA.toLowerCase()} play` };
  }
  if (styleA === PlayingStyle.BOTH || styleB === PlayingStyle.BOTH) {
    const specific = styleA === PlayingStyle.BOTH ? styleB : styleA;
    return { score: 90, reason: `Matches ${specific.toLowerCase()} format` };
  }
  return { score: 25, reason: "Different preferred format (Singles vs Doubles)" };
}

/**
 * Computes full transparent compatibility score between two player profiles
 */
export function calculatePlayerCompatibility(
  profileA: any,
  profileB: any,
  weights: CompatibilityWeights = DEFAULT_WEIGHTS
): CompatibilityResult {
  const reasons: string[] = [];

  // 1. Skill Compatibility (40%)
  const skillRes = calculateSkillCompatibility(
    profileA.skillLevel || PlayerSkillLevel.INTERMEDIATE,
    profileB.skillLevel || PlayerSkillLevel.INTERMEDIATE
  );
  if (skillRes.reason) reasons.push(skillRes.reason);

  // 2. Availability Compatibility (25%)
  const availRes = calculateAvailabilityCompatibility(
    profileA.preferredDays,
    profileB.preferredDays,
    profileA.preferredTimeStart,
    profileA.preferredTimeEnd,
    profileB.preferredTimeStart,
    profileB.preferredTimeEnd
  );
  if (availRes.reason) reasons.push(availRes.reason);

  // 3. Venue & Location Compatibility (20%)
  const venueRes = calculateVenueCompatibility(
    {
      homeVenueId: profileA.homeVenueId,
      preferredVenueIds: profileA.preferredVenueIds,
      district: profileA.district,
      venueName: profileA.homeVenue?.name,
    },
    {
      homeVenueId: profileB.homeVenueId,
      preferredVenueIds: profileB.preferredVenueIds,
      district: profileB.district,
      venueName: profileB.homeVenue?.name,
    }
  );
  if (venueRes.reason) reasons.push(venueRes.reason);

  // 4. Playing Style Compatibility (15%)
  const styleRes = calculateStyleCompatibility(
    profileA.playingStyle || PlayingStyle.BOTH,
    profileB.playingStyle || PlayingStyle.BOTH
  );
  if (styleRes.reason && reasons.length < 3) reasons.push(styleRes.reason);

  const weightedScore = Math.round(
    skillRes.score * weights.skill +
      availRes.score * weights.availability +
      venueRes.score * weights.venue +
      styleRes.score * weights.style
  );

  const finalScore = Math.max(0, Math.min(100, weightedScore));

  return {
    score: finalScore,
    breakdown: {
      skillScore: skillRes.score,
      availabilityScore: availRes.score,
      venueScore: venueRes.score,
      styleScore: styleRes.score,
    },
    reasons: reasons.slice(0, 3),
  };
}

/**
 * Calculates Match compatibility for a player profile
 */
export function calculateMatchCompatibility(
  match: any,
  profile: any
): { score: number; explanation: string } {
  if (!profile) {
    return { score: 75, explanation: "Open for all players" };
  }

  // Skill alignment
  let skillPoints = 80;
  const pLevelNum = SKILL_NUMERIC[profile.skillLevel as PlayerSkillLevel] ?? 1;

  if (match.skillLevel === SkillLevel.ALL_LEVELS) {
    skillPoints = 95;
  } else {
    let mLevelNum = 1;
    if (match.skillLevel === SkillLevel.BEGINNER) mLevelNum = 0;
    else if (match.skillLevel === SkillLevel.INTERMEDIATE) mLevelNum = 1;
    else if (match.skillLevel === SkillLevel.ADVANCED) mLevelNum = 2;

    const diff = Math.abs(pLevelNum - mLevelNum);
    if (diff === 0) skillPoints = 100;
    else if (diff === 1) skillPoints = 75;
    else skillPoints = 30;
  }

  // Venue alignment
  let venuePoints = 40;
  if (profile.homeVenueId && profile.homeVenueId === match.venueId) {
    venuePoints = 100;
  } else if (
    Array.isArray(profile.preferredVenueIds) &&
    profile.preferredVenueIds.includes(match.venueId)
  ) {
    venuePoints = 90;
  }

  // Style alignment
  let stylePoints = 80;
  if (profile.playingStyle === PlayingStyle.BOTH) {
    stylePoints = 100;
  } else if (
    (profile.playingStyle === PlayingStyle.DOUBLES && match.format === "Doubles") ||
    (profile.playingStyle === PlayingStyle.SINGLES && match.format === "Singles")
  ) {
    stylePoints = 100;
  } else {
    stylePoints = 40;
  }

  const score = Math.round(skillPoints * 0.5 + venuePoints * 0.3 + stylePoints * 0.2);

  const explanations: string[] = [];
  if (venuePoints >= 90) {
    explanations.push(`Hosted at your preferred venue (${match.venue?.name || "venue"})`);
  }
  if (skillPoints >= 90) {
    explanations.push(`Matches your ${profile.skillLevel?.toLowerCase() || ""} skill tier`);
  }
  if (explanations.length === 0) {
    explanations.push(`Friendly ${match.format || "badminton"} session`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    explanation: explanations.join(" • "),
  };
}

/**
 * Batch fetch player stats from database to prevent N+1 queries
 */
export async function getBatchPlayerStats(userIds: number[]): Promise<Map<number, PlayerStats>> {
  const map = new Map<number, PlayerStats>();
  if (userIds.length === 0) return map;

  for (const id of userIds) {
    map.set(id, { matchesPlayed: 0, matchesHosted: 0, completedMatches: 0 });
  }

  const [playedCounts, hostedCounts, completedCounts] = await Promise.all([
    prisma.matchParticipant.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        status: "JOINED",
      },
      _count: { _all: true },
    }),
    prisma.match.groupBy({
      by: ["creatorId"],
      where: {
        creatorId: { in: userIds },
      },
      _count: { _all: true },
    }),
    prisma.matchParticipant.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        status: "JOINED",
        match: {
          status: MatchStatus.COMPLETED,
        },
      },
      _count: { _all: true },
    }),
  ]);

  for (const item of playedCounts) {
    const s = map.get(item.userId);
    if (s) s.matchesPlayed = item._count._all;
  }
  for (const item of hostedCounts) {
    const s = map.get(item.creatorId);
    if (s) s.matchesHosted = item._count._all;
  }
  for (const item of completedCounts) {
    const s = map.get(item.userId);
    if (s) s.completedMatches = item._count._all;
  }

  return map;
}

/**
 * Fetch dynamic player stats for a single user
 */
export async function getPlayerStats(userId: number): Promise<PlayerStats> {
  const map = await getBatchPlayerStats([userId]);
  return map.get(userId) || { matchesPlayed: 0, matchesHosted: 0, completedMatches: 0 };
}

/**
 * Get or automatically create player profile for a user
 */
export async function getOrCreatePlayerProfile(userId: number) {
  let profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      homeVenue: true,
    },
  });

  if (!profile) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User does not exist.");
    }

    const defaultVenue = await prisma.venue.findFirst();

    profile = await prisma.playerProfile.create({
      data: {
        userId,
        displayName: user.name,
        avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + (userId % 100)}?auto=format&fit=crop&w=200&q=80`,
        skillLevel: PlayerSkillLevel.INTERMEDIATE,
        playingStyle: PlayingStyle.BOTH,
        playHand: PlayHand.RIGHT,
        preferredDays: ["SATURDAY", "SUNDAY"],
        preferredTimeStart: "18:00",
        preferredTimeEnd: "21:00",
        homeVenueId: defaultVenue?.id || null,
        preferredVenueIds: defaultVenue ? [defaultVenue.id] : [],
        bio: "Badminton enthusiast looking for friendly rallies, sparring partners, and good sportsmanship.",
        yearsExperience: 2,
        city: "Hanoi",
        district: defaultVenue?.location || "Thanh Xuan",
        isProfileComplete: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        homeVenue: true,
      },
    });
  }

  const stats = await getPlayerStats(userId);

  return {
    ...profile,
    stats,
  };
}

/**
 * Update player profile
 */
export async function updatePlayerProfile(userId: number, input: UpdateProfileInput) {
  // Validate display name
  if (input.displayName !== undefined) {
    if (!input.displayName.trim() || input.displayName.trim().length < 2) {
      throw new Error("Display name must be at least 2 characters.");
    }
    if (input.displayName.trim().length > 50) {
      throw new Error("Display name cannot exceed 50 characters.");
    }
  }

  // Validate years of experience
  if (input.yearsExperience !== undefined && input.yearsExperience !== null) {
    if (input.yearsExperience < 0 || input.yearsExperience > 50) {
      throw new Error("Years of experience must be between 0 and 50.");
    }
  }

  // Validate home venue
  if (input.homeVenueId) {
    const venueExists = await prisma.venue.findUnique({
      where: { id: input.homeVenueId },
    });
    if (!venueExists) {
      throw new Error("Selected home venue does not exist.");
    }
  }

  // Ensure preferred days are normalized
  let cleanDays: string[] | undefined;
  if (input.preferredDays) {
    cleanDays = input.preferredDays.map(normalizeDay).filter((d) => VALID_DAYS.includes(d));
  }

  // Upsert profile
  const updated = await prisma.playerProfile.upsert({
    where: { userId },
    update: {
      displayName: input.displayName?.trim(),
      avatarUrl: input.avatarUrl,
      skillLevel: input.skillLevel,
      playingStyle: input.playingStyle,
      playHand: input.playHand,
      preferredDays: cleanDays,
      preferredTimeStart: input.preferredTimeStart,
      preferredTimeEnd: input.preferredTimeEnd,
      homeVenueId: input.homeVenueId,
      preferredVenueIds: input.preferredVenueIds,
      bio: input.bio?.trim(),
      yearsExperience: input.yearsExperience,
      city: input.city?.trim(),
      district: input.district?.trim(),
      isProfileComplete: input.isProfileComplete ?? true,
    },
    create: {
      userId,
      displayName: input.displayName?.trim() || "Badminton Player",
      avatarUrl: input.avatarUrl,
      skillLevel: input.skillLevel || PlayerSkillLevel.INTERMEDIATE,
      playingStyle: input.playingStyle || PlayingStyle.BOTH,
      playHand: input.playHand || PlayHand.RIGHT,
      preferredDays: cleanDays || ["SATURDAY", "SUNDAY"],
      preferredTimeStart: input.preferredTimeStart || "18:00",
      preferredTimeEnd: input.preferredTimeEnd || "21:00",
      homeVenueId: input.homeVenueId,
      preferredVenueIds: input.preferredVenueIds || [],
      bio: input.bio?.trim(),
      yearsExperience: input.yearsExperience ?? 1,
      city: input.city?.trim() || "Hanoi",
      district: input.district?.trim(),
      isProfileComplete: input.isProfileComplete ?? true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      homeVenue: true,
    },
  });

  const stats = await getPlayerStats(userId);

  return {
    ...updated,
    stats,
  };
}

/**
 * List & Filter players for discovery with server-side pagination and privacy protection
 */
export async function listPlayers(options: {
  search?: string;
  skillLevel?: string;
  playingStyle?: string;
  venueId?: number;
  currentUserId?: number;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 12));
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (options.skillLevel && options.skillLevel !== "ALL") {
    whereClause.skillLevel = options.skillLevel as PlayerSkillLevel;
  }

  if (options.playingStyle && options.playingStyle !== "ALL") {
    whereClause.playingStyle = options.playingStyle as PlayingStyle;
  }

  if (options.venueId) {
    whereClause.OR = [
      { homeVenueId: options.venueId },
      { preferredVenueIds: { has: options.venueId } },
    ];
  }

  if (options.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { displayName: { contains: s, mode: "insensitive" } },
      { bio: { contains: s, mode: "insensitive" } },
      { district: { contains: s, mode: "insensitive" } },
      { user: { name: { contains: s, mode: "insensitive" } } },
    ];
  }

  // Count total matches for pagination
  const total = await prisma.playerProfile.count({ where: whereClause });

  // Query paginated profiles with privacy (user: id, name only)
  const profiles = await prisma.playerProfile.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      homeVenue: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  // Batch load stats for all profiles to prevent N+1 queries
  const userIds = profiles.map((p) => p.userId);
  const statsMap = await getBatchPlayerStats(userIds);

  // Load current user profile for compatibility scores if provided
  let currentProfile: any = null;
  if (options.currentUserId) {
    currentProfile = await prisma.playerProfile.findUnique({
      where: { userId: options.currentUserId },
      include: { homeVenue: true },
    });
  }

  const enriched = profiles.map((p) => {
    const stats = statsMap.get(p.userId) || {
      matchesPlayed: 0,
      matchesHosted: 0,
      completedMatches: 0,
    };
    let compatibility: CompatibilityResult | null = null;
    if (currentProfile && currentProfile.userId !== p.userId) {
      compatibility = calculatePlayerCompatibility(currentProfile, p);
    }
    return {
      ...p,
      stats,
      compatibility,
    };
  });

  return {
    players: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Smart Matchmaking: Get ranked compatible players for the current user
 * Uses stable, deterministic ranking (score desc, completedMatches desc, id asc)
 */
export async function getRecommendedPlayers(currentUserId: number, limit = 10) {
  const currentProfile = await prisma.playerProfile.findUnique({
    where: { userId: currentUserId },
    include: { homeVenue: true },
  });

  if (!currentProfile) {
    return [];
  }

  // Requirement: Exclude users with incomplete profiles and exclude the current user
  const candidates = await prisma.playerProfile.findMany({
    where: {
      userId: { not: currentUserId },
      isProfileComplete: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      homeVenue: true,
    },
  });

  // Batch load candidate stats to avoid N+1 queries
  const candidateUserIds = candidates.map((c) => c.userId);
  const statsMap = await getBatchPlayerStats(candidateUserIds);

  const scoredList = candidates.map((candidate) => {
    const compatibility = calculatePlayerCompatibility(currentProfile, candidate);
    const stats = statsMap.get(candidate.userId) || {
      matchesPlayed: 0,
      matchesHosted: 0,
      completedMatches: 0,
    };
    return {
      ...candidate,
      compatibility,
      stats,
    };
  });

  // Deterministic, stable sorting:
  // 1. Compatibility score descending
  // 2. Completed matches descending (tie-breaker)
  // 3. User ID ascending (stable final tie-breaker)
  scoredList.sort((a, b) => {
    if (b.compatibility.score !== a.compatibility.score) {
      return b.compatibility.score - a.compatibility.score;
    }
    if (b.stats.completedMatches !== a.stats.completedMatches) {
      return b.stats.completedMatches - a.stats.completedMatches;
    }
    return a.id - b.id;
  });

  return scoredList.slice(0, limit);
}

/**
 * Get recommended open matches tailored for a player
 * Excludes cancelled or full matches; deterministic ranking by score desc, id asc
 */
export async function getRecommendedMatchesForPlayer(userId: number, limit = 6) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { homeVenue: true },
  });

  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.OPEN,
      date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      creatorId: { not: userId }, // Don't recommend own hosted matches
    },
    include: {
      creator: { select: { id: true, name: true } },
      venue: true,
      court: true,
      booking: true,
      participants: true,
    },
    orderBy: { date: "asc" },
  });

  const scoredMatches = matches
    .map((m) => {
      const activeCount = m.participants.filter((p) => p.status === "JOINED").length;
      const remainingSpots = Math.max(0, m.maxPlayers - activeCount);
      const { score, explanation } = calculateMatchCompatibility(m, profile);
      return {
        ...m,
        activeCount,
        remainingSpots,
        compatibilityScore: score,
        compatibilityReason: explanation,
      };
    })
    .filter((m) => m.remainingSpots > 0 && m.status === MatchStatus.OPEN);

  // Deterministic sorting
  scoredMatches.sort((a, b) => {
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    return a.id - b.id;
  });

  return scoredMatches.slice(0, limit);
}
