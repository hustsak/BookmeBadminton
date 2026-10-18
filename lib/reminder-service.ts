import { prisma } from "./prisma";
import { NotificationType, BookingStatus, MatchStatus } from "@prisma/client";
import { createNotification } from "./notification-service";

export interface ReminderJobResult {
  bookingsProcessed: number;
  matchesProcessed: number;
  remindersSent: number;
}

/**
 * Evaluates upcoming confirmed bookings and scheduled matches, sending 24-hour
 * and 2-hour reminders to participating players.
 *
 * Requirements:
 * - 24-hour and 2-hour window checks before start time.
 * - Skips CANCELLED bookings and CANCELLED / COMPLETED matches.
 * - Idempotency: Uses deterministic unique keys to prevent duplicate reminders.
 * - Respects user notification preferences.
 */
export async function processReminders(
  referenceTime: Date = new Date()
): Promise<ReminderJobResult> {
  let remindersSent = 0;
  let bookingsProcessed = 0;
  let matchesProcessed = 0;

  const nowMs = referenceTime.getTime();

  // -------------------------------------------------------------
  // 1. Process Booking Reminders (24h and 2h windows)
  // -------------------------------------------------------------
  // Look for bookings in the next 26 hours (to cover both 24h and 2h windows)
  const windowEnd = new Date(nowMs + 26 * 60 * 60 * 1000);

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      bookingDate: {
        gte: new Date(new Date(nowMs).setHours(0, 0, 0, 0)),
        lte: windowEnd,
      },
    },
    include: {
      court: {
        include: { venue: true },
      },
      user: true,
    },
  });

  bookingsProcessed = upcomingBookings.length;

  for (const b of upcomingBookings) {
    // Construct exact booking start timestamp
    const dateStr = b.bookingDate.toISOString().split("T")[0];
    const [h, m] = b.startTime.split(":").map(Number);
    const bookingStart = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`);
    const diffHours = (bookingStart.getTime() - nowMs) / (1000 * 60 * 60);

    // Window 1: ~24 hours ahead (between 20h and 26h)
    if (diffHours >= 20 && diffHours <= 26) {
      const idempotencyKey = `remind-booking-${b.id}-24h`;
      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey },
      });
      if (!existing) {
        const sent = await createNotification({
          userId: b.userId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: `Court Reminder: Tomorrow at ${b.startTime}`,
          message: `Your badminton court #${b.court.name} at ${b.court.venue.name} is scheduled for tomorrow at ${b.startTime}. Get your racquets ready!`,
          link: "/bookings",
          metadata: { bookingId: b.id, window: "24h" },
          idempotencyKey,
        });
        if (sent) remindersSent++;
      }
    }

    // Window 2: ~2 hours ahead (between 0.5h and 3h)
    if (diffHours >= 0.5 && diffHours <= 3) {
      const idempotencyKey = `remind-booking-${b.id}-2h`;
      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey },
      });
      if (!existing) {
        const sent = await createNotification({
          userId: b.userId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: `Court Reminder: Starting in 2 Hours!`,
          message: `Your session at ${b.court.venue.name} starts today at ${b.startTime}. Court #${b.court.name} is reserved for you.`,
          link: "/bookings",
          metadata: { bookingId: b.id, window: "2h" },
          idempotencyKey,
        });
        if (sent) remindersSent++;
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Process Match Reminders (24h and 2h windows)
  // -------------------------------------------------------------
  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: { in: [MatchStatus.OPEN, MatchStatus.FULL] },
      date: {
        gte: new Date(new Date(nowMs).setHours(0, 0, 0, 0)),
        lte: windowEnd,
      },
    },
    include: {
      venue: true,
      participants: {
        where: { status: "JOINED" },
        include: { user: true },
      },
    },
  });

  matchesProcessed = upcomingMatches.length;

  for (const match of upcomingMatches) {
    const dateStr = match.date.toISOString().split("T")[0];
    const [h, m] = match.startTime.split(":").map(Number);
    const matchStart = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`);
    const diffHours = (matchStart.getTime() - nowMs) / (1000 * 60 * 60);

    for (const participant of match.participants) {
      // Window 1: ~24 hours ahead
      if (diffHours >= 20 && diffHours <= 26) {
        const idempotencyKey = `remind-match-${match.id}-user-${participant.userId}-24h`;
        const existing = await prisma.notification.findUnique({
          where: { idempotencyKey },
        });
        if (!existing) {
          const sent = await createNotification({
            userId: participant.userId,
            type: NotificationType.MATCH_REMINDER,
            title: `Match Reminder: Tomorrow at ${match.startTime}`,
            message: `Your friendly match "${match.title}" at ${match.venue.name} is coming up tomorrow (${match.startTime} - ${match.endTime}).`,
            link: `/friendly-matches/${match.id}`,
            metadata: { matchId: match.id, window: "24h" },
            idempotencyKey,
          });
          if (sent) remindersSent++;
        }
      }

      // Window 2: ~2 hours ahead
      if (diffHours >= 0.5 && diffHours <= 3) {
        const idempotencyKey = `remind-match-${match.id}-user-${participant.userId}-2h`;
        const existing = await prisma.notification.findUnique({
          where: { idempotencyKey },
        });
        if (!existing) {
          const sent = await createNotification({
            userId: participant.userId,
            type: NotificationType.MATCH_REMINDER,
            title: `Match Starting Soon: In 2 Hours!`,
            message: `"${match.title}" starts today at ${match.startTime} at ${match.venue.name}. See you on the court!`,
            link: `/friendly-matches/${match.id}`,
            metadata: { matchId: match.id, window: "2h" },
            idempotencyKey,
          });
          if (sent) remindersSent++;
        }
      }
    }
  }

  return {
    bookingsProcessed,
    matchesProcessed,
    remindersSent,
  };
}
