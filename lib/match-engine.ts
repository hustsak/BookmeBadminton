import { prisma } from "./prisma";
import {
  MatchStatus,
  SkillLevel,
  ParticipantRole,
  ParticipantStatus,
  NotificationType,
} from "@prisma/client";
import { cancelBooking, isSlotInPast, normalizeDateString } from "./booking-engine";
import { createNotification } from "./notification-service";

export class MatchValidationError extends Error {
  code = "VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "MatchValidationError";
  }
}

export class MatchNotFoundError extends Error {
  code = "NOT_FOUND";
  constructor(message: string = "Match not found.") {
    super(message);
    this.name = "MatchNotFoundError";
  }
}

export class MatchAuthorizationError extends Error {
  code = "UNAUTHORIZED";
  constructor(message: string = "You do not have permission to perform this action.") {
    super(message);
    this.name = "MatchAuthorizationError";
  }
}

export class MatchConflictError extends Error {
  code = "MATCH_CONFLICT";
  constructor(message: string) {
    super(message);
    this.name = "MatchConflictError";
  }
}

// Helper: Normalize skill level input
export function normalizeSkillLevel(levelStr?: string): SkillLevel {
  if (!levelStr) return SkillLevel.ALL_LEVELS;
  const clean = levelStr.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (clean === "BEGINNER") return SkillLevel.BEGINNER;
  if (clean === "INTERMEDIATE") return SkillLevel.INTERMEDIATE;
  if (clean === "ADVANCED") return SkillLevel.ADVANCED;
  return SkillLevel.ALL_LEVELS;
}

// Helper: Format skill level for UI
export function formatSkillLevel(level: SkillLevel): string {
  switch (level) {
    case SkillLevel.BEGINNER:
      return "Beginner";
    case SkillLevel.INTERMEDIATE:
      return "Intermediate";
    case SkillLevel.ADVANCED:
      return "Advanced";
    case SkillLevel.ALL_LEVELS:
    default:
      return "All Levels";
  }
}

export interface MatchFilterOptions {
  date?: string;
  venueId?: number;
  skillLevel?: string;
  availableSpots?: boolean;
  status?: string;
  userId?: number; // to mark isJoined
}

export interface CreateMatchInput {
  creatorId: number;
  venueId: number;
  courtId?: number | null;
  bookingId?: number | null;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  skillLevel?: string;
  maxPlayers?: number;
  format?: string;
  feePerPerson?: number;
  shuttlecockProvided?: boolean;
  description?: string;
}

export interface UpdateMatchInput {
  title?: string;
  venueId?: number;
  courtId?: number | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  skillLevel?: string;
  maxPlayers?: number;
  format?: string;
  feePerPerson?: number;
  shuttlecockProvided?: boolean;
  description?: string;
}

/**
 * Format raw Match record with computed participant and spot calculations
 */
export function formatMatchWithDetails(match: any, currentUserId?: number) {
  const activeParticipants = (match.participants || []).filter(
    (p: any) => p.status === ParticipantStatus.JOINED
  );
  const currentPlayers = activeParticipants.length;
  const remainingSpots = Math.max(0, match.maxPlayers - currentPlayers);
  const isFull = currentPlayers >= match.maxPlayers || match.status === MatchStatus.FULL;
  const isJoined = currentUserId
    ? activeParticipants.some((p: any) => p.userId === currentUserId)
    : false;
  const isCreator = currentUserId ? match.creatorId === currentUserId : false;

  return {
    ...match,
    skillLevelFormatted: formatSkillLevel(match.skillLevel),
    currentPlayers,
    remainingSpots,
    isFull,
    isJoined,
    isCreator,
    activeParticipants,
  };
}

/**
 * List & Filter matches
 */
export async function listMatches(options: MatchFilterOptions = {}) {
  const whereClause: any = {};

  // Status filtering
  if (options.status && options.status !== "ALL") {
    whereClause.status = options.status as MatchStatus;
  } else if (!options.status) {
    // By default, do not hide completed/cancelled unless availableSpots requested
  }

  // Date filtering
  if (options.date) {
    const normalized = normalizeDateString(options.date);
    const startOfDay = new Date(`${normalized}T00:00:00.000Z`);
    const endOfDay = new Date(`${normalized}T23:59:59.999Z`);
    whereClause.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  // Venue filtering
  if (options.venueId) {
    whereClause.venueId = options.venueId;
  }

  // Skill Level filtering
  if (options.skillLevel && options.skillLevel !== "ALL") {
    whereClause.skillLevel = normalizeSkillLevel(options.skillLevel);
  }

  const rawMatches = await prisma.match.findMany({
    where: whereClause,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      venue: {
        select: {
          id: true,
          name: true,
          location: true,
          address: true,
          imageUrl: true,
          rating: true,
          reviewCount: true,
        },
      },
      court: {
        select: {
          id: true,
          name: true,
          priceHour: true,
          surface: true,
        },
      },
      booking: {
        select: {
          id: true,
          bookingCode: true,
          status: true,
          startTime: true,
          endTime: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  let formatted = rawMatches.map((m) => formatMatchWithDetails(m, options.userId));

  // Available spots filter
  if (options.availableSpots) {
    formatted = formatted.filter((m) => m.status === MatchStatus.OPEN && m.remainingSpots > 0);
  }

  return formatted;
}

/**
 * Get match details by ID
 */
export async function getMatchById(matchId: number, currentUserId?: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      venue: {
        select: {
          id: true,
          name: true,
          location: true,
          address: true,
          imageUrl: true,
          rating: true,
          reviewCount: true,
        },
      },
      court: {
        select: {
          id: true,
          name: true,
          priceHour: true,
          surface: true,
        },
      },
      booking: {
        select: {
          id: true,
          bookingCode: true,
          status: true,
          startTime: true,
          endTime: true,
          totalPrice: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      result: {
        include: {
          submittedBy: {
            select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } },
          },
          confirmedBy: {
            select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } },
          },
          disputedBy: {
            select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } },
          },
        },
      },
      reviews: {
        include: {
          reviewer: {
            select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } },
          },
          recipient: {
            select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } },
          },
        },
      },
    },
  });

  if (!match) {
    throw new MatchNotFoundError(`Match #${matchId} not found.`);
  }

  return formatMatchWithDetails(match, currentUserId);
}

/**
 * Create a new open match
 */
export async function createMatch(input: CreateMatchInput) {
  // 1. Validate creator
  const creator = await prisma.user.findUnique({
    where: { id: input.creatorId },
  });
  if (!creator) {
    throw new MatchValidationError("Creator user account not found.");
  }

  // 2. Validate title
  if (!input.title || input.title.trim().length < 3) {
    throw new MatchValidationError("Match title must be at least 3 characters.");
  }

  // 3. Validate venue
  const venue = await prisma.venue.findUnique({
    where: { id: input.venueId },
  });
  if (!venue) {
    throw new MatchValidationError("Selected venue does not exist.");
  }

  // 4. Validate player limits
  const maxPlayers = input.maxPlayers !== undefined ? Number(input.maxPlayers) : 4;
  if (isNaN(maxPlayers) || maxPlayers < 2) {
    throw new MatchValidationError("Maximum players limit must be at least 2.");
  }
  if (maxPlayers > 16) {
    throw new MatchValidationError("Maximum players limit cannot exceed 16.");
  }

  // 5. Validate date and time
  const normalizedDate = normalizeDateString(input.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new MatchValidationError("Invalid date format. Expected YYYY-MM-DD.");
  }

  if (!input.startTime || !/^\d{2}:\d{2}$/.test(input.startTime)) {
    throw new MatchValidationError("Invalid start time format. Expected HH:MM.");
  }

  if (isSlotInPast(normalizedDate, input.startTime)) {
    throw new MatchValidationError("Cannot create a match for a past date or time.");
  }

  let endTime = input.endTime;
  if (!endTime) {
    // Default to 2 hours
    const [h, m] = input.startTime.split(":").map(Number);
    const endH = (h + 2) % 24;
    endTime = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } else if (!/^\d{2}:\d{2}$/.test(endTime)) {
    throw new MatchValidationError("Invalid end time format. Expected HH:MM.");
  }

  // 6. Validate court if specified
  let validCourtId: number | null = null;
  if (input.courtId) {
    const court = await prisma.court.findUnique({
      where: { id: input.courtId },
    });
    if (!court || court.venueId !== input.venueId) {
      throw new MatchValidationError("Specified court does not belong to the selected venue.");
    }
    validCourtId = court.id;
  }

  // 7. Validate booking if linked
  let validBookingId: number | null = null;
  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { court: true },
    });
    if (!booking) {
      throw new MatchValidationError("Specified booking does not exist.");
    }
    if (booking.userId !== input.creatorId) {
      throw new MatchValidationError("You can only link bookings created by your account.");
    }
    if (booking.court.venueId !== input.venueId) {
      throw new MatchValidationError("Linked booking must be at the same venue.");
    }
    if (booking.status === "CANCELLED") {
      throw new MatchValidationError("Cannot link a cancelled booking.");
    }
    validBookingId = booking.id;
    validCourtId = booking.courtId;
  }

  const matchDate = new Date(`${normalizedDate}T12:00:00.000Z`);
  const skillLevel = normalizeSkillLevel(input.skillLevel);

  // Transaction: Create match and automatically add creator as HOST
  const result = await prisma.$transaction(async (tx) => {
    const match = await tx.match.create({
      data: {
        title: input.title.trim(),
        creatorId: input.creatorId,
        venueId: input.venueId,
        courtId: validCourtId,
        bookingId: validBookingId,
        date: matchDate,
        startTime: input.startTime,
        endTime,
        skillLevel,
        maxPlayers,
        format: input.format || "Doubles",
        feePerPerson: input.feePerPerson ? Math.max(0, input.feePerPerson) : 0,
        shuttlecockProvided: input.shuttlecockProvided ?? true,
        description: input.description?.trim() || null,
        status: MatchStatus.OPEN,
      },
    });

    // Creator is automatically registered as HOST participant
    await tx.matchParticipant.create({
      data: {
        matchId: match.id,
        userId: input.creatorId,
        role: ParticipantRole.HOST,
        status: ParticipantStatus.JOINED,
      },
    });

    return match;
  });

  return getMatchById(result.id, input.creatorId);
}

/**
 * Join an open match with strict concurrency protection
 */
export async function joinMatch(matchId: number, userId: number) {
  // Use transactional concurrency lock to prevent race conditions & overcapacity
  const result = await prisma.$transaction(async (tx) => {
    // Acquire PostgreSQL advisory transaction lock for this specific match
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('match_' || ${matchId}))`;

    // Fetch fresh match with participants
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        participants: true,
      },
    });

    if (!match) {
      throw new MatchNotFoundError(`Match #${matchId} does not exist.`);
    }

    // Reject joins for cancelled or completed matches
    if (match.status === MatchStatus.CANCELLED) {
      throw new MatchConflictError("Cannot join a cancelled match.");
    }
    if (match.status === MatchStatus.COMPLETED) {
      throw new MatchConflictError("Cannot join a match that has already finished.");
    }

    // Verify user exists in database
    const user = await tx.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new MatchValidationError("User account not found.");
    }

    // Check existing participation
    const existing = match.participants.find((p) => p.userId === userId);
    if (existing && existing.status === ParticipantStatus.JOINED) {
      if (existing.role === ParticipantRole.HOST || match.creatorId === userId) {
        throw new MatchConflictError("You are the host/creator and are already part of this match.");
      }
      throw new MatchConflictError("You have already joined this match.");
    }

    // Count currently active joined participants
    const activeParticipants = match.participants.filter(
      (p) => p.status === ParticipantStatus.JOINED
    );

    if (activeParticipants.length >= match.maxPlayers || match.status === MatchStatus.FULL) {
      // Ensure match is marked FULL
      if (match.status !== MatchStatus.FULL) {
        await tx.match.update({
          where: { id: matchId },
          data: { status: MatchStatus.FULL },
        });
      }
      throw new MatchConflictError("This match is already full. No spots available.");
    }

    // Insert or reactivate participant
    if (existing && existing.status === ParticipantStatus.LEFT) {
      await tx.matchParticipant.update({
        where: { id: existing.id },
        data: {
          status: ParticipantStatus.JOINED,
          joinedAt: new Date(),
        },
      });
    } else {
      await tx.matchParticipant.create({
        data: {
          matchId,
          userId,
          role: ParticipantRole.PLAYER,
          status: ParticipantStatus.JOINED,
        },
      });
    }

    // Update match status to FULL if participant limit is now reached
    const newCount = activeParticipants.length + 1;
    if (newCount >= match.maxPlayers) {
      await tx.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.FULL },
      });
    }

    // Return the updated match
    const updated = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        creator: { select: { id: true, name: true, email: true, phone: true } },
        venue: { select: { id: true, name: true, location: true, address: true, imageUrl: true } },
        court: { select: { id: true, name: true, priceHour: true, surface: true } },
        booking: { select: { id: true, bookingCode: true, status: true, startTime: true, endTime: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    return formatMatchWithDetails(updated, userId);
  });

  // Post-commit notification for match creator (if joining user is not creator)
  if (result.creatorId !== userId) {
    try {
      const joiningUser = result.participants?.find((p: any) => p.userId === userId)?.user;
      const userName = joiningUser?.name || "A badminton player";
      await createNotification({
        userId: result.creatorId,
        type: NotificationType.MATCH_JOINED,
        title: `Player Joined: ${result.title}`,
        message: `${userName} has joined your match at ${result.venue?.name || "the venue"}. (${result.currentPlayers}/${result.maxPlayers} players)`,
        link: `/friendly-matches/${result.id}`,
        metadata: { matchId: result.id, joiningUserId: userId },
        idempotencyKey: `match-${result.id}-join-${userId}`,
      });
    } catch (err) {
      console.warn("Failed to dispatch match join notification:", err);
    }
  }

  return result;
}

/**
 * Leave a match and reopen spot if full
 */
export async function leaveMatch(matchId: number, userId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // Acquire PostgreSQL advisory lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('match_' || ${matchId}))`;

    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        participants: true,
      },
    });

    if (!match) {
      throw new MatchNotFoundError(`Match #${matchId} does not exist.`);
    }

    if (match.creatorId === userId) {
      throw new MatchValidationError(
        "As the creator and host, you cannot leave the match. You may cancel the match if you can no longer host."
      );
    }

    const participant = match.participants.find(
      (p) => p.userId === userId && p.status === ParticipantStatus.JOINED
    );

    if (!participant) {
      throw new MatchValidationError("You are not currently an active player in this match.");
    }

    // Mark participant as LEFT
    await tx.matchParticipant.update({
      where: { id: participant.id },
      data: { status: ParticipantStatus.LEFT },
    });

    // Check remaining active count
    const remainingCount = await tx.matchParticipant.count({
      where: {
        matchId,
        status: ParticipantStatus.JOINED,
      },
    });

    // If match was FULL and now has available spots, reopen it!
    if (match.status === MatchStatus.FULL && remainingCount < match.maxPlayers) {
      await tx.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.OPEN },
      });
    }

    const updated = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        creator: { select: { id: true, name: true, email: true, phone: true } },
        venue: { select: { id: true, name: true, location: true, address: true, imageUrl: true } },
        court: { select: { id: true, name: true, priceHour: true, surface: true } },
        booking: { select: { id: true, bookingCode: true, status: true, startTime: true, endTime: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    return formatMatchWithDetails(updated, userId);
  });

  // Post-commit notification for match creator
  try {
    const leavingUser = await prisma.user.findUnique({ where: { id: userId } });
    const userName = leavingUser?.name || "A player";
    await createNotification({
      userId: result.creatorId,
      type: NotificationType.MATCH_LEFT,
      title: `Player Left: ${result.title}`,
      message: `${userName} has left your match at ${result.venue?.name || "the club"}. A spot has reopened.`,
      link: `/friendly-matches/${result.id}`,
      metadata: { matchId: result.id, leavingUserId: userId },
      idempotencyKey: `match-${result.id}-leave-${userId}-${Date.now().toString().slice(0, 8)}`,
    });
  } catch (err) {
    console.warn("Failed to dispatch match leave notification:", err);
  }

  return result;
}

/**
 * Update match details (Restricted to Creator)
 */
export async function updateMatch(
  matchId: number,
  userId: number,
  updates: UpdateMatchInput
) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('match_' || ${matchId}))`;

    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          where: { status: ParticipantStatus.JOINED },
        },
      },
    });

    if (!match) {
      throw new MatchNotFoundError(`Match #${matchId} does not exist.`);
    }

    // Strict Creator authorization
    if (match.creatorId !== userId) {
      throw new MatchAuthorizationError("Only the match creator can update this match.");
    }

    if (match.status === MatchStatus.CANCELLED) {
      throw new MatchValidationError("Cannot update a cancelled match.");
    }
    if (match.status === MatchStatus.COMPLETED) {
      throw new MatchValidationError("Cannot update a completed match.");
    }

    const dataToUpdate: any = {};

    if (updates.title !== undefined) {
      if (!updates.title.trim() || updates.title.trim().length < 3) {
        throw new MatchValidationError("Match title must be at least 3 characters.");
      }
      dataToUpdate.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      dataToUpdate.description = updates.description?.trim() || null;
    }

    if (updates.skillLevel !== undefined) {
      dataToUpdate.skillLevel = normalizeSkillLevel(updates.skillLevel);
    }

    if (updates.format !== undefined) {
      dataToUpdate.format = updates.format;
    }

    if (updates.feePerPerson !== undefined) {
      dataToUpdate.feePerPerson = Math.max(0, updates.feePerPerson);
    }

    if (updates.shuttlecockProvided !== undefined) {
      dataToUpdate.shuttlecockProvided = updates.shuttlecockProvided;
    }

    if (updates.date !== undefined) {
      const normalizedDate = normalizeDateString(updates.date);
      const testTime = updates.startTime || match.startTime;
      if (isSlotInPast(normalizedDate, testTime)) {
        throw new MatchValidationError("Cannot reschedule a match to a past date or time.");
      }
      dataToUpdate.date = new Date(`${normalizedDate}T12:00:00.000Z`);
    }

    if (updates.startTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(updates.startTime)) {
        throw new MatchValidationError("Invalid start time format.");
      }
      dataToUpdate.startTime = updates.startTime;
    }

    if (updates.endTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(updates.endTime)) {
        throw new MatchValidationError("Invalid end time format.");
      }
      dataToUpdate.endTime = updates.endTime;
    }

    if (updates.venueId !== undefined) {
      const venue = await tx.venue.findUnique({ where: { id: updates.venueId } });
      if (!venue) throw new MatchValidationError("Venue not found.");
      dataToUpdate.venueId = updates.venueId;
    }

    if (updates.courtId !== undefined) {
      if (updates.courtId === null) {
        dataToUpdate.courtId = null;
      } else {
        const venueIdToCheck = updates.venueId || match.venueId;
        const court = await tx.court.findUnique({ where: { id: updates.courtId } });
        if (!court || court.venueId !== venueIdToCheck) {
          throw new MatchValidationError("Court does not belong to the selected venue.");
        }
        dataToUpdate.courtId = updates.courtId;
      }
    }

    // Max players validation
    if (updates.maxPlayers !== undefined) {
      const newMax = Number(updates.maxPlayers);
      if (isNaN(newMax) || newMax < 2 || newMax > 16) {
        throw new MatchValidationError("Maximum players must be between 2 and 16.");
      }
      const activeCount = match.participants.length;
      if (newMax < activeCount) {
        throw new MatchValidationError(
          `Cannot reduce max players to ${newMax} because ${activeCount} players are currently joined.`
        );
      }
      dataToUpdate.maxPlayers = newMax;

      // Adjust status based on new limit
      if (match.status === MatchStatus.FULL && newMax > activeCount) {
        dataToUpdate.status = MatchStatus.OPEN;
      } else if (match.status === MatchStatus.OPEN && newMax <= activeCount) {
        dataToUpdate.status = MatchStatus.FULL;
      }
    }

    await tx.match.update({
      where: { id: matchId },
      data: dataToUpdate,
    });

    const updated = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        creator: { select: { id: true, name: true, email: true, phone: true } },
        venue: { select: { id: true, name: true, location: true, address: true, imageUrl: true } },
        court: { select: { id: true, name: true, priceHour: true, surface: true } },
        booking: { select: { id: true, bookingCode: true, status: true, startTime: true, endTime: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    return formatMatchWithDetails(updated, userId);
  });

  // Post-commit notification to active participants if schedule/venue/court changed
  if (updates.date || updates.startTime || updates.endTime || updates.venueId || updates.courtId) {
    try {
      const activeParticipants = result.participants?.filter(
        (p: any) => p.userId !== userId && p.status === ParticipantStatus.JOINED
      ) || [];
      if (activeParticipants.length > 0) {
        for (const p of activeParticipants) {
          await createNotification({
            userId: p.userId,
            type: NotificationType.SYSTEM,
            title: `Match Updated: ${result.title}`,
            message: `The schedule or venue details for match "${result.title}" have been updated. Date: ${result.date}, Time: ${result.startTime} - ${result.endTime}.`,
            link: `/friendly-matches/${result.id}`,
            metadata: { matchId: result.id, updatedBy: userId },
          });
        }
      }
    } catch (notifErr) {
      console.warn("Failed to notify participants of match update:", notifErr);
    }
  }

  return result;
}

/**
 * Cancel a match (Restricted to Creator)
 * Also handles linked booking cancellation consistently
 */
export async function cancelMatch(
  matchId: number,
  userId: number,
  reason?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('match_' || ${matchId}))`;

    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        booking: true,
      },
    });

    if (!match) {
      throw new MatchNotFoundError(`Match #${matchId} does not exist.`);
    }

    // Strict Creator authorization
    if (match.creatorId !== userId) {
      throw new MatchAuthorizationError("Only the match creator can cancel this match.");
    }

    if (match.status === MatchStatus.CANCELLED) {
      return formatMatchWithDetails(match, userId); // Idempotent
    }

    if (match.status === MatchStatus.COMPLETED) {
      throw new MatchValidationError("Cannot cancel a completed match.");
    }

    // 1. Update match status to CANCELLED
    const updated = await tx.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.CANCELLED,
      },
      include: {
        creator: { select: { id: true, name: true, email: true, phone: true } },
        venue: { select: { id: true, name: true, location: true, address: true, imageUrl: true } },
        court: { select: { id: true, name: true, priceHour: true, surface: true } },
        booking: { select: { id: true, bookingCode: true, status: true, startTime: true, endTime: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    // 2. Booking integration: consistently cancel linked court booking if active
    if (match.bookingId && match.booking && match.booking.status !== "CANCELLED") {
      try {
        await cancelBooking(match.bookingId, {
          cancelledByUserId: userId,
          reason: reason || `Cancelled with open match #${match.id}: "${match.title}"`,
        });
      } catch (err) {
        console.warn(`Failed to cancel linked booking #${match.bookingId}:`, err);
      }
    }

    return formatMatchWithDetails(updated, userId);
  });

  // Post-commit notification to all joined participants
  try {
    const participantsToNotify = result.participants?.filter(
      (p: any) => p.userId !== userId && p.status === ParticipantStatus.JOINED
    ) || [];
    if (participantsToNotify.length > 0) {
      for (const p of participantsToNotify) {
        await createNotification({
          userId: p.userId,
          type: NotificationType.MATCH_CANCELLED,
          title: `Match Cancelled: ${result.title}`,
          message: `Match "${result.title}" scheduled for ${result.date} at ${result.venue?.name || "the club"} has been cancelled by the host.${reason ? ` Reason: ${reason}` : ""}`,
          link: `/friendly-matches`,
          idempotencyKey: `match-${matchId}-cancelled-${p.userId}`,
          metadata: { matchId, cancelledBy: userId, reason },
        });
      }
    }
  } catch (notifErr) {
    console.warn("Failed to notify participants of match cancellation:", notifErr);
  }

  return result;
}
