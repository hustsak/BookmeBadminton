import { prisma } from "./prisma";
import { InvitationStatus, MatchStatus, NotificationType } from "@prisma/client";
import { joinMatch } from "./match-engine";
import { createNotification } from "./notification-service";

export interface CreateInvitationInput {
  senderId: number;
  recipientId: number;
  matchId: number;
  notes?: string;
}

/**
 * Creates an invitation to an open match.
 * Prevents duplicates, validates authorization and recipient status.
 */
export async function createMatchInvitation(input: CreateInvitationInput) {
  const { senderId, recipientId, matchId, notes } = input;

  if (senderId === recipientId) {
    throw new Error("You cannot invite yourself to a match.");
  }

  // 1. Fetch match with participants
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      venue: true,
      creator: true,
      participants: {
        where: { status: "JOINED" },
      },
    },
  });

  if (!match) {
    throw new Error("Match not found.");
  }

  if (match.status === MatchStatus.CANCELLED) {
    throw new Error("Cannot invite players to a cancelled match.");
  }

  if (match.status === MatchStatus.COMPLETED) {
    throw new Error("Cannot invite players to a completed match.");
  }

  // Verify sender is creator or joined participant
  const isCreator = match.creatorId === senderId;
  const isParticipant = match.participants.some((p) => p.userId === senderId);
  if (!isCreator && !isParticipant) {
    throw new Error("You must be the host or participant of this match to send invitations.");
  }

  // Check if match is already full
  if (match.participants.length >= match.maxPlayers || match.status === MatchStatus.FULL) {
    throw new Error("This match is already full. No open spots available.");
  }

  // Check if recipient is already joined
  const recipientAlreadyJoined = match.participants.some((p) => p.userId === recipientId);
  if (recipientAlreadyJoined) {
    throw new Error("This player has already joined the match.");
  }

  // 2. Check for duplicate pending invitation
  const existingPending = await prisma.matchInvitation.findFirst({
    where: {
      matchId,
      recipientId,
      status: InvitationStatus.PENDING,
    },
  });

  if (existingPending) {
    throw new Error("An active invitation has already been sent to this player.");
  }

  // 3. Create the invitation record
  const invitation = await prisma.matchInvitation.create({
    data: {
      matchId,
      senderId,
      recipientId,
      status: InvitationStatus.PENDING,
      notes: notes?.trim() || null,
    },
    include: {
      match: {
        include: {
          venue: true,
          creator: { select: { id: true, name: true } },
        },
      },
      sender: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true } },
    },
  });

  // 4. Trigger in-app notification to recipient
  const senderName = invitation.sender.name || "A badminton player";
  const dateStr = match.date.toISOString().split("T")[0];
  await createNotification({
    userId: recipientId,
    type: NotificationType.MATCH_INVITATION,
    title: `Match Invitation: ${match.title}`,
    message: `${senderName} invited you to join "${match.title}" at ${match.venue.name} on ${dateStr} (${match.startTime}).`,
    link: `/friendly-matches/${match.id}`,
    metadata: {
      invitationId: invitation.id,
      matchId: match.id,
      senderId,
    },
    idempotencyKey: `invitation-${invitation.id}-recipient`,
  });

  return invitation;
}

/**
 * Responds to a match invitation (ACCEPT or DECLINE)
 * On acceptance: calls joinMatch to atomically join and enforce participant capacity.
 */
export async function respondToInvitation(
  invitationId: number,
  recipientId: number,
  action: "ACCEPT" | "DECLINE"
) {
  const invitation = await prisma.matchInvitation.findUnique({
    where: { id: invitationId },
    include: {
      match: {
        include: {
          venue: true,
          creator: true,
          participants: { where: { status: "JOINED" } },
        },
      },
      sender: true,
      recipient: true,
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  // Only recipient can accept or decline
  if (invitation.recipientId !== recipientId) {
    throw new Error("You are not authorized to respond to this invitation.");
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new Error(`This invitation has already been ${invitation.status.toLowerCase()}.`);
  }

  if (action === "DECLINE") {
    const updated = await prisma.matchInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.DECLINED },
    });

    // Notify sender that invitation was declined
    await createNotification({
      userId: invitation.senderId,
      type: NotificationType.MATCH_LEFT,
      title: "Invitation Declined",
      message: `${invitation.recipient.name} declined the invitation to "${invitation.match.title}".`,
      link: `/friendly-matches/${invitation.matchId}`,
      idempotencyKey: `invitation-${invitation.id}-declined`,
    });

    return updated;
  }

  // If action is ACCEPT:
  // Check match state before joining
  if (invitation.match.status === MatchStatus.CANCELLED) {
    await prisma.matchInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED },
    });
    throw new Error("Cannot join: This match has been cancelled by the host.");
  }

  if (
    invitation.match.participants.length >= invitation.match.maxPlayers ||
    invitation.match.status === MatchStatus.FULL
  ) {
    throw new Error("Cannot join: This match has filled up and has no remaining spots.");
  }

  // Atomically join match via joinMatch
  await joinMatch(invitation.matchId, recipientId);

  // Mark invitation as ACCEPTED
  const accepted = await prisma.matchInvitation.update({
    where: { id: invitationId },
    data: { status: InvitationStatus.ACCEPTED },
  });

  // Notify sender / host
  if (invitation.senderId !== recipientId) {
    await createNotification({
      userId: invitation.senderId,
      type: NotificationType.MATCH_JOINED,
      title: "Invitation Accepted! 🏸",
      message: `${invitation.recipient.name} accepted your invitation to "${invitation.match.title}".`,
      link: `/friendly-matches/${invitation.matchId}`,
      idempotencyKey: `invitation-${invitation.id}-accepted`,
    });
  }

  return accepted;
}

/**
 * Lists invitations received or sent by a user
 */
export async function listUserInvitations(
  userId: number,
  options: { type?: "received" | "sent"; status?: InvitationStatus } = {}
) {
  const whereClause: any = {};

  if (options.type === "sent") {
    whereClause.senderId = userId;
  } else {
    // Default to received
    whereClause.recipientId = userId;
  }

  if (options.status) {
    whereClause.status = options.status;
  }

  const invitations = await prisma.matchInvitation.findMany({
    where: whereClause,
    include: {
      match: {
        include: {
          venue: { select: { id: true, name: true, location: true } },
          creator: { select: { id: true, name: true } },
        },
      },
      sender: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
}

/**
 * Lists invitations for a specific match
 */
export async function listMatchInvitations(matchId: number) {
  return await prisma.matchInvitation.findMany({
    where: { matchId },
    include: {
      sender: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
