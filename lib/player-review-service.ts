import { prisma } from "./prisma";
import { MatchStatus, MatchResultStatus, ParticipantStatus, ReviewModerationStatus, NotificationType } from "@prisma/client";
import { createNotification } from "./notification-service";

export interface CreatePlayerReviewInput {
  matchId: number;
  reviewerId: number;
  recipientId: number;
  rating: number;
  comment?: string;
}

export interface UpdatePlayerReviewInput {
  reviewId: number;
  reviewerId: number;
  rating?: number;
  comment?: string;
}

export interface ReportReviewInput {
  reviewId: number;
  reporterId: number;
  reason: string;
  details?: string;
}

const REVIEW_EDIT_WINDOW_HOURS = 48;
const MAX_COMMENT_LENGTH = 500;

/**
 * Creates a rating and review for a fellow participant in a completed match.
 */
export async function createPlayerReview(input: CreatePlayerReviewInput) {
  const { matchId, reviewerId, recipientId, rating, comment } = input;

  // 1. Validation: Self-rating prevention
  if (reviewerId === recipientId) {
    throw new Error("You cannot rate or review yourself");
  }

  // 2. Validation: Rating range
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5 stars");
  }

  // 3. Validation: Comment length
  if (comment && comment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment exceeds maximum allowed length of ${MAX_COMMENT_LENGTH} characters`);
  }

  // 4. Match and participant verification
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

  // Prevent ratings for cancelled, incomplete, or disputed matches
  if (match.status !== MatchStatus.COMPLETED) {
    throw new Error("Ratings can only be submitted for completed matches");
  }

  if (!match.result || match.result.status !== MatchResultStatus.CONFIRMED) {
    throw new Error("Cannot submit ratings for a match without a confirmed final result");
  }

  // Check eligibility: reviewer and recipient must both be active participants of this match
  const participantIds = match.participants.map((p) => p.userId);
  if (!participantIds.includes(reviewerId)) {
    throw new Error("Only participants in this match can submit ratings");
  }

  if (!participantIds.includes(recipientId)) {
    throw new Error("Recipient is not a participant of this match");
  }

  // Check duplicate review
  const existingReview = await prisma.playerReview.findUnique({
    where: {
      reviewerId_recipientId_matchId: {
        reviewerId,
        recipientId,
        matchId,
      },
    },
  });

  if (existingReview) {
    throw new Error("You have already submitted a review for this player in this match");
  }

  const review = await prisma.playerReview.create({
    data: {
      matchId,
      reviewerId,
      recipientId,
      rating,
      comment: comment ? comment.trim() : null,
      moderationStatus: ReviewModerationStatus.ACTIVE,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          profile: {
            select: { displayName: true, avatarUrl: true, skillLevel: true },
          },
        },
      },
    },
  });

  // Notify recipient of new rating
  createNotification({
    userId: recipientId,
    type: NotificationType.PLAYER_RATED,
    title: "New Player Rating Received",
    message: `You received a ${rating}-star rating for your recent match at ${match.venue?.name || "the venue"}.`,
    link: `/players/${recipientId}`,
    metadata: { matchId, reviewerId, rating },
    idempotencyKey: `player-review-${review.id}`,
  }).catch((err) => console.error("Notification error:", err));

  return review;
}

/**
 * Updates a previously submitted player review.
 * Only allowed within 48 hours of creation and by the original reviewer.
 */
export async function updatePlayerReview(input: UpdatePlayerReviewInput) {
  const { reviewId, reviewerId, rating, comment } = input;

  const review = await prisma.playerReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.reviewerId !== reviewerId) {
    throw new Error("You can only edit your own reviews");
  }

  // Check 48 hour window
  const now = Date.now();
  const createdTime = review.createdAt.getTime();
  const elapsedHours = (now - createdTime) / (1000 * 60 * 60);

  if (elapsedHours > REVIEW_EDIT_WINDOW_HOURS) {
    throw new Error(`Reviews can only be edited within ${REVIEW_EDIT_WINDOW_HOURS} hours of submission`);
  }

  // Validate updates
  if (rating !== undefined) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5 stars");
    }
  }

  if (comment !== undefined && comment !== null && comment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment exceeds maximum allowed length of ${MAX_COMMENT_LENGTH} characters`);
  }

  return prisma.playerReview.update({
    where: { id: reviewId },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment: comment ? comment.trim() : null } : {}),
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          profile: {
            select: { displayName: true, avatarUrl: true, skillLevel: true },
          },
        },
      },
    },
  });
}

/**
 * Reports a review for moderation
 */
export async function reportPlayerReview(input: ReportReviewInput) {
  const { reviewId, reporterId, reason, details } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error("Report reason is required");
  }

  const review = await prisma.playerReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  const report = await prisma.reviewReport.create({
    data: {
      reviewId,
      reporterId,
      reason: reason.trim(),
      details: details ? details.trim() : null,
      status: "PENDING",
    },
  });

  // Flag review if multiple reports or high severity
  const reportCount = await prisma.reviewReport.count({
    where: { reviewId },
  });

  if (reportCount >= 2 && review.moderationStatus === ReviewModerationStatus.ACTIVE) {
    await prisma.playerReview.update({
      where: { id: reviewId },
      data: { moderationStatus: ReviewModerationStatus.FLAGGED },
    });
  }

  return report;
}

/**
 * Gets reviews for a given player with pagination.
 * Does NOT expose private user information (email, phone, etc.).
 */
export async function getPlayerReviews(
  recipientId: number,
  options?: { page?: number; limit?: number; includeRemoved?: boolean }
) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause: any = {
    recipientId,
    moderationStatus: options?.includeRemoved
      ? undefined
      : { not: ReviewModerationStatus.REMOVED },
  };

  const [total, reviews] = await Promise.all([
    prisma.playerReview.count({ where: whereClause }),
    prisma.playerReview.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        matchId: true,
        rating: true,
        comment: true,
        moderationStatus: true,
        createdAt: true,
        updatedAt: true,
        reviewer: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                skillLevel: true,
              },
            },
          },
        },
        match: {
          select: {
            id: true,
            title: true,
            date: true,
            venue: {
              select: { id: true, name: true, location: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
