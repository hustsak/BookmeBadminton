import { prisma } from "./prisma";
import { NotificationType } from "@prisma/client";

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: any;
  idempotencyKey?: string | null;
}

export interface NotificationFilterOptions {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

export interface NotificationPreferencesInput {
  bookingUpdates?: boolean;
  matchUpdates?: boolean;
  reminders?: boolean;
  social?: boolean;
}

/**
 * Creates an in-app notification if user preferences permit it.
 * Uses idempotencyKey to prevent duplicate notifications during retries or race conditions.
 * Safe post-commit execution: does not crash caller on unexpected errors.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    const { userId, type, title, message, link, metadata, idempotencyKey } = input;

    // Check user preferences
    const preferences = await getNotificationPreferences(userId);

    // Filter by user preference toggles
    const bookingTypes: NotificationType[] = [
      NotificationType.BOOKING_CONFIRMED,
      NotificationType.BOOKING_CANCELLED,
      NotificationType.PAYMENT_CONFIRMED,
    ];
    if (bookingTypes.includes(type) && !preferences.bookingUpdates) {
      return null;
    }

    const matchTypes: NotificationType[] = [
      NotificationType.MATCH_INVITATION,
      NotificationType.MATCH_JOINED,
      NotificationType.MATCH_LEFT,
      NotificationType.MATCH_CANCELLED,
      NotificationType.MATCH_RESULT_SUBMITTED,
      NotificationType.MATCH_RESULT_CONFIRMED,
      NotificationType.MATCH_RESULT_DISPUTED,
    ];
    if (matchTypes.includes(type) && !preferences.matchUpdates) {
      return null;
    }

    if (type === NotificationType.MATCH_REMINDER && !preferences.reminders) {
      return null;
    }

    const socialTypes: NotificationType[] = [
      NotificationType.PLAYER_CONNECTION_REQUEST,
      NotificationType.PLAYER_CONNECTION_ACCEPTED,
      NotificationType.PLAYER_RATED,
    ];
    if (socialTypes.includes(type) && !preferences.social) {
      return null;
    }

    // Idempotency check: if key already exists, return existing record
    if (idempotencyKey) {
      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        idempotencyKey: idempotencyKey || null,
        isRead: false,
      },
    });

    return notification;
  } catch (error: any) {
    // If error is unique constraint collision on idempotencyKey, return the existing notification
    if (error.code === "P2002" && input.idempotencyKey) {
      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return existing;
    }

    console.error("Failed to create notification:", error);
    return null;
  }
}

/**
 * Lists paginated notifications for a specific user
 */
export async function getUserNotifications(
  userId: number,
  options: NotificationFilterOptions = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 15));
  const skip = (page - 1) * limit;

  const whereClause: any = { userId };

  if (options.unreadOnly) {
    whereClause.isRead = false;
  }

  if (options.type) {
    whereClause.type = options.type;
  }

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: whereClause }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Returns accurate unread count for current user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * Marks a single notification as read with ownership check
 */
export async function markAsRead(notificationId: number, userId: number) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (notification.userId !== userId) {
    throw new Error("You do not have permission to modify this notification.");
  }

  if (notification.isRead) {
    return notification; // idempotent
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Marks all notifications as read for current user
 */
export async function markAllAsRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { count: result.count };
}

/**
 * Deletes a notification with ownership check
 */
export async function deleteNotification(notificationId: number, userId: number) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (notification.userId !== userId) {
    throw new Error("You do not have permission to delete this notification.");
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { success: true };
}

/**
 * Retrieves notification preferences with sensible defaults
 */
export async function getNotificationPreferences(userId: number) {
  let pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
    pref = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        bookingUpdates: true,
        matchUpdates: true,
        reminders: true,
        social: true,
        emailChannel: false,
        pushChannel: false,
        smsChannel: false,
      },
    });
  }

  return pref;
}

/**
 * Updates notification preferences for current user
 */
export async function updateNotificationPreferences(
  userId: number,
  input: NotificationPreferencesInput
) {
  return await prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      ...(input.bookingUpdates !== undefined && { bookingUpdates: Boolean(input.bookingUpdates) }),
      ...(input.matchUpdates !== undefined && { matchUpdates: Boolean(input.matchUpdates) }),
      ...(input.reminders !== undefined && { reminders: Boolean(input.reminders) }),
      ...(input.social !== undefined && { social: Boolean(input.social) }),
    },
    create: {
      userId,
      bookingUpdates: input.bookingUpdates ?? true,
      matchUpdates: input.matchUpdates ?? true,
      reminders: input.reminders ?? true,
      social: input.social ?? true,
      emailChannel: false,
      pushChannel: false,
      smsChannel: false,
    },
  });
}
