import { prisma } from "./prisma";
import { MatchStatus, MatchResultStatus, ParticipantStatus, NotificationType } from "@prisma/client";
import { createNotification } from "./notification-service";

export interface SetScoreInput {
  set: number;
  team1: number;
  team2: number;
}

export interface SubmitMatchResultInput {
  matchId: number;
  submittedById: number;
  score: string;
  setScores?: SetScoreInput[];
  winnerTeam?: 1 | 2 | null;
  team1PlayerIds: number[];
  team2PlayerIds: number[];
}

export interface ConfirmMatchResultInput {
  matchId: number;
  confirmedById: number;
}

export interface DisputeMatchResultInput {
  matchId: number;
  disputedById: number;
  reason: string;
}

/**
 * Helper to calculate match scheduled end time
 */
export function getMatchEndDateTime(date: Date, endTime: string): Date {
  const matchEnd = new Date(date);
  const [hours, minutes] = endTime.split(":").map(Number);
  matchEnd.setHours(hours || 0, minutes || 0, 0, 0);
  return matchEnd;
}

/**
 * Validates badminton scores and team allocations
 */
export function validateMatchResultInput(input: SubmitMatchResultInput, participantIds: number[]) {
  const { score, setScores, winnerTeam, team1PlayerIds, team2PlayerIds } = input;

  if (!score || typeof score !== "string" || score.trim().length === 0) {
    throw new Error("Match score is required (e.g., '21-19, 18-21, 21-17')");
  }

  if (!Array.isArray(team1PlayerIds) || team1PlayerIds.length === 0) {
    throw new Error("Team 1 must have at least one player");
  }
  if (!Array.isArray(team2PlayerIds) || team2PlayerIds.length === 0) {
    throw new Error("Team 2 must have at least one player");
  }

  // Ensure all team players are active participants
  const participantSet = new Set(participantIds);
  for (const pId of team1PlayerIds) {
    if (!participantSet.has(pId)) {
      throw new Error(`Player ID ${pId} in Team 1 is not an active participant of this match`);
    }
  }
  for (const pId of team2PlayerIds) {
    if (!participantSet.has(pId)) {
      throw new Error(`Player ID ${pId} in Team 2 is not an active participant of this match`);
    }
  }

  // Ensure no overlap between team 1 and team 2
  const team1Set = new Set(team1PlayerIds);
  for (const pId of team2PlayerIds) {
    if (team1Set.has(pId)) {
      throw new Error(`Player ID ${pId} cannot be in both Team 1 and Team 2`);
    }
  }

  // Validate set scores if provided
  if (setScores && Array.isArray(setScores) && setScores.length > 0) {
    let team1SetsWon = 0;
    let team2SetsWon = 0;

    for (const s of setScores) {
      if (typeof s.team1 !== "number" || typeof s.team2 !== "number" || s.team1 < 0 || s.team2 < 0) {
        throw new Error("Set scores must be non-negative integers");
      }
      if (s.team1 > s.team2) {
        team1SetsWon++;
      } else if (s.team2 > s.team1) {
        team2SetsWon++;
      }
    }

    if (winnerTeam === 1 && team1SetsWon < team2SetsWon) {
      throw new Error("Winner indicated is Team 1, but Team 2 won more sets");
    }
    if (winnerTeam === 2 && team2SetsWon < team1SetsWon) {
      throw new Error("Winner indicated is Team 2, but Team 1 won more sets");
    }
  }

  if (winnerTeam !== undefined && winnerTeam !== null && winnerTeam !== 1 && winnerTeam !== 2) {
    throw new Error("Winner team must be 1, 2, or null (draw)");
  }
}

/**
 * Submits a match result.
 * Must be submitted by an active participant after the match has completed its scheduled time.
 */
export async function submitMatchResult(input: SubmitMatchResultInput) {
  const { matchId, submittedById, score, setScores, winnerTeam, team1PlayerIds, team2PlayerIds } = input;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: {
        where: { status: ParticipantStatus.JOINED },
      },
      result: true,
      venue: true,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status === MatchStatus.CANCELLED) {
    throw new Error("Cannot submit results for a cancelled match");
  }

  // Check if match scheduled end time has arrived
  const matchEndTime = getMatchEndDateTime(match.date, match.endTime);
  const now = new Date();
  if (now.getTime() < matchEndTime.getTime()) {
    throw new Error("Cannot submit results for a match that has not finished yet");
  }

  // Check submitter participation
  const activeParticipantIds = match.participants.map((p) => p.userId);
  if (!activeParticipantIds.includes(submittedById)) {
    throw new Error("Only active participants in this match can submit results");
  }

  // Check existing result
  if (match.result && match.result.status === MatchResultStatus.CONFIRMED) {
    throw new Error("Match result has already been confirmed and finalized. Cannot resubmit.");
  }

  // Validate scores and teams
  validateMatchResultInput(input, activeParticipantIds);

  const winningPlayerIds: number[] =
    winnerTeam === 1 ? team1PlayerIds : winnerTeam === 2 ? team2PlayerIds : [];

  // Determine initial status:
  // If only 1 player is in the match (e.g. solo practice/host test), can confirm immediately.
  // Otherwise, PENDING_CONFIRMATION
  const isSoloMatch = activeParticipantIds.length <= 1;
  const initialStatus = isSoloMatch ? MatchResultStatus.CONFIRMED : MatchResultStatus.PENDING_CONFIRMATION;

  const result = await prisma.$transaction(async (tx) => {
    let savedResult;
    if (match.result) {
      // Update existing result (e.g. from previous dispute or draft)
      savedResult = await tx.matchResult.update({
        where: { id: match.result.id },
        data: {
          submittedById,
          status: initialStatus,
          score: score.trim(),
          setScores: setScores ? (setScores as any) : undefined,
          winnerTeam: winnerTeam ?? null,
          team1PlayerIds,
          team2PlayerIds,
          winningPlayerIds,
          confirmedById: isSoloMatch ? submittedById : null,
          confirmedAt: isSoloMatch ? new Date() : null,
          disputedById: null,
          disputedAt: null,
          disputeReason: null,
        },
      });
    } else {
      savedResult = await tx.matchResult.create({
        data: {
          matchId,
          submittedById,
          status: initialStatus,
          score: score.trim(),
          setScores: setScores ? (setScores as any) : undefined,
          winnerTeam: winnerTeam ?? null,
          team1PlayerIds,
          team2PlayerIds,
          winningPlayerIds,
          confirmedById: isSoloMatch ? submittedById : null,
          confirmedAt: isSoloMatch ? new Date() : null,
        },
      });
    }

    if (isSoloMatch) {
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    return savedResult;
  });

  // Notify other participants of result submission
  for (const participantId of activeParticipantIds) {
    if (participantId !== submittedById) {
      createNotification({
        userId: participantId,
        type: NotificationType.MATCH_RESULT_SUBMITTED,
        title: "Match Result Submitted",
        message: `A score of "${score}" was submitted for your match at ${match.venue?.name || "the venue"}. Please review and confirm or dispute.`,
        link: `/friendly-matches/${matchId}`,
        metadata: { matchId, score, submittedById },
        idempotencyKey: `result-submitted-${result.id}-${participantId}`,
      }).catch((err) => console.error("Notification error:", err));
    }
  }

  return result;
}

/**
 * Confirms a pending match result.
 * Only active participants who are NOT the submitter can confirm.
 */
export async function confirmMatchResult(input: ConfirmMatchResultInput) {
  const { matchId, confirmedById } = input;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: {
        where: { status: ParticipantStatus.JOINED },
      },
      result: true,
      venue: true,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (!match.result) {
    throw new Error("No match result found to confirm");
  }

  if (match.result.status === MatchResultStatus.CONFIRMED) {
    return match.result; // Already confirmed
  }

  if (match.result.status === MatchResultStatus.DISPUTED) {
    throw new Error("Cannot confirm a disputed match result. Please resubmit an agreed score first.");
  }

  const activeParticipantIds = match.participants.map((p) => p.userId);
  if (!activeParticipantIds.includes(confirmedById)) {
    throw new Error("Only active participants in this match can confirm results");
  }

  if (match.result.submittedById === confirmedById) {
    throw new Error("Submitter cannot confirm their own result. An opposing participant or teammate must confirm.");
  }

  const now = new Date();
  const updatedResult = await prisma.$transaction(async (tx) => {
    const res = await tx.matchResult.update({
      where: { id: match.result!.id },
      data: {
        status: MatchResultStatus.CONFIRMED,
        confirmedById,
        confirmedAt: now,
      },
    });

    await tx.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        completedAt: now,
      },
    });

    return res;
  });

  // Notify all participants of confirmation
  for (const participantId of activeParticipantIds) {
    createNotification({
      userId: participantId,
      type: NotificationType.MATCH_RESULT_CONFIRMED,
      title: "Match Result Confirmed",
      message: `The match result (${updatedResult.score}) for ${match.title} has been confirmed and finalized!`,
      link: `/friendly-matches/${matchId}`,
      metadata: { matchId, confirmedById },
      idempotencyKey: `result-confirmed-${updatedResult.id}-${participantId}`,
    }).catch((err) => console.error("Notification error:", err));
  }

  return updatedResult;
}

/**
 * Disputes a pending match result.
 * Only active participants in the match can dispute.
 */
export async function disputeMatchResult(input: DisputeMatchResultInput) {
  const { matchId, disputedById, reason } = input;

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    throw new Error("A reason is required to dispute a match result");
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: {
        where: { status: ParticipantStatus.JOINED },
      },
      result: true,
      venue: true,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (!match.result) {
    throw new Error("No match result found to dispute");
  }

  if (match.result.status === MatchResultStatus.CONFIRMED) {
    throw new Error("Cannot dispute a result that has already been confirmed and finalized");
  }

  const activeParticipantIds = match.participants.map((p) => p.userId);
  if (!activeParticipantIds.includes(disputedById)) {
    throw new Error("Only active participants in this match can dispute results");
  }

  const updatedResult = await prisma.matchResult.update({
    where: { id: match.result.id },
    data: {
      status: MatchResultStatus.DISPUTED,
      disputedById,
      disputedAt: new Date(),
      disputeReason: reason.trim(),
    },
  });

  // Notify participants of dispute
  for (const participantId of activeParticipantIds) {
    if (participantId !== disputedById) {
      createNotification({
        userId: participantId,
        type: NotificationType.MATCH_RESULT_DISPUTED,
        title: "Match Result Disputed",
        message: `The submitted result for ${match.title} was disputed: "${reason.trim()}". Please discuss and submit the correct result.`,
        link: `/friendly-matches/${matchId}`,
        metadata: { matchId, disputedById, reason: reason.trim() },
        idempotencyKey: `result-disputed-${updatedResult.id}-${participantId}`,
      }).catch((err) => console.error("Notification error:", err));
    }
  }

  return updatedResult;
}

/**
 * Fetches match result with full details
 */
export async function getMatchResult(matchId: number) {
  return prisma.matchResult.findUnique({
    where: { matchId },
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          profile: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      },
      confirmedBy: {
        select: {
          id: true,
          name: true,
          profile: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      },
      disputedBy: {
        select: {
          id: true,
          name: true,
          profile: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      },
    },
  });
}
