import { prisma } from "./prisma";
import { Prisma, NotificationType } from "@prisma/client";
import { createNotification } from "./notification-service";

export class SlotConflictError extends Error {
  code = "SLOT_CONFLICT";
  constructor(message: string) {
    super(message);
    this.name = "SlotConflictError";
  }
}

export class ValidationError extends Error {
  code = "VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  code = "NOT_FOUND";
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class AuthorizationError extends Error {
  code = "UNAUTHORIZED";
  constructor(message: string = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

// -------------------------------------------------------------
// Time Helpers
// -------------------------------------------------------------

export function timeToMinutes(time: string): number {
  const parts = time.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || "0", 10);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addHoursToTime(time: string, hours: number): string {
  const mins = timeToMinutes(time) + hours * 60;
  return minutesToTime(mins);
}

/**
 * Requirement: Handle overlapping intervals correctly:
 * newStart < existingEnd AND newEnd > existingStart
 */
export function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const minStartA = timeToMinutes(startA);
  const minEndA = timeToMinutes(endA);
  const minStartB = timeToMinutes(startB);
  const minEndB = timeToMinutes(endB);

  return minStartA < minEndB && minEndA > minStartB;
}

export function normalizeDateString(dateInput: string | Date): string {
  if (dateInput instanceof Date) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const d = String(dateInput.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return dateInput.slice(0, 10);
}

export function parseBookingDateMidnight(dateStr: string): Date {
  // Use noon or midnight UTC representation for database storing
  return new Date(`${dateStr}T12:00:00.000Z`);
}

export function isSlotInPast(dateStr: string, timeStr: string): boolean {
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = String(now.getMonth() + 1).padStart(2, "0");
  const currentD = String(now.getDate()).padStart(2, "0");
  const todayStr = `${currentY}-${currentM}-${currentD}`;

  if (dateStr < todayStr) {
    return true;
  }

  if (dateStr === todayStr) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const slotMinutes = timeToMinutes(timeStr);
    // Allow booking up to slot start
    return slotMinutes <= currentMinutes;
  }

  return false;
}

// -------------------------------------------------------------
// Availability Engine
// -------------------------------------------------------------

export type SlotStatus = "AVAILABLE" | "BOOKED" | "MAINTENANCE" | "PAST";

export type SlotDetail = {
  time: string;
  endTime: string;
  status: SlotStatus;
  available: boolean;
  reason?: string;
  allowedDurations: number[]; // which durations (1, 2, 3) can start at this slot consecutively
};

export async function getCourtAvailability(courtId: number, dateStr: string) {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      venue: true,
    },
  });

  if (!court || !court.isActive) {
    throw new NotFoundError("Court not found or currently inactive.");
  }

  const normalizedDate = normalizeDateString(dateStr);
  const startOfDay = new Date(`${normalizedDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${normalizedDate}T23:59:59.999Z`);

  // Active bookings (Exclude cancelled bookings!)
  const activeBookings = await prisma.booking.findMany({
    where: {
      courtId,
      bookingDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      id: true,
      bookingCode: true,
      startTime: true,
      endTime: true,
      duration: true,
      status: true,
    },
  });

  // Scheduled maintenance blocks
  const maintenanceBlocks = await prisma.maintenanceBlock.findMany({
    where: {
      courtId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const openTime = court.venue.openTime || "06:00";
  const closeTime = court.venue.closeTime || "23:00";
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  // Generate hourly slots
  const allSlotTimes: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += 60) {
    allSlotTimes.push(minutesToTime(m));
  }

  // Determine individual slot status
  const slotsMap = new Map<string, { status: SlotStatus; reason?: string }>();

  for (const time of allSlotTimes) {
    const slotEndTime = minutesToTime(timeToMinutes(time) + 60);

    if (isSlotInPast(normalizedDate, time)) {
      slotsMap.set(time, { status: "PAST", reason: "This time has already passed." });
      continue;
    }

    // Check maintenance
    const maintenanceConflict = maintenanceBlocks.find((m) =>
      intervalsOverlap(time, slotEndTime, m.startTime, m.endTime)
    );
    if (maintenanceConflict) {
      slotsMap.set(time, {
        status: "MAINTENANCE",
        reason: maintenanceConflict.reason || "Scheduled court maintenance.",
      });
      continue;
    }

    // Check bookings
    const bookingConflict = activeBookings.find((b) => {
      const bEndTime = b.endTime || addHoursToTime(b.startTime, b.duration);
      return intervalsOverlap(time, slotEndTime, b.startTime, bEndTime);
    });

    if (bookingConflict) {
      slotsMap.set(time, {
        status: "BOOKED",
        reason: "Reserved by player.",
      });
      continue;
    }

    slotsMap.set(time, { status: "AVAILABLE" });
  }

  // Calculate allowed durations for each slot (consecutive availability)
  const slotDetails: SlotDetail[] = allSlotTimes.map((time, index) => {
    const { status, reason } = slotsMap.get(time) || { status: "AVAILABLE" };
    const slotEndTime = minutesToTime(timeToMinutes(time) + 60);
    const available = status === "AVAILABLE";

    const allowedDurations: number[] = [];
    if (available) {
      // Check 1, 2, 3 hours
      for (const dur of [1, 2, 3]) {
        const potentialEndMinutes = timeToMinutes(time) + dur * 60;
        if (potentialEndMinutes <= closeMinutes) {
          let allConsecutiveFree = true;
          for (let step = 0; step < dur; step++) {
            const stepSlot = allSlotTimes[index + step];
            if (!stepSlot || slotsMap.get(stepSlot)?.status !== "AVAILABLE") {
              allConsecutiveFree = false;
              break;
            }
          }
          if (allConsecutiveFree) {
            allowedDurations.push(dur);
          }
        }
      }
    }

    return {
      time,
      endTime: slotEndTime,
      status,
      available,
      reason,
      allowedDurations,
    };
  });

  return {
    court: {
      id: court.id,
      name: court.name,
      surface: court.surface,
      priceHour: court.priceHour,
    },
    venue: {
      id: court.venue.id,
      name: court.venue.name,
      location: court.venue.location,
      address: court.venue.address,
      openTime,
      closeTime,
    },
    date: normalizedDate,
    slots: slotDetails,
    totalSlots: slotDetails.length,
    availableSlotsCount: slotDetails.filter((s) => s.available).length,
    bookedSlotsCount: slotDetails.filter((s) => s.status === "BOOKED").length,
    maintenanceSlotsCount: slotDetails.filter((s) => s.status === "MAINTENANCE").length,
  };
}

// -------------------------------------------------------------
// Booking Creation Engine
// -------------------------------------------------------------

export type CreateBookingInput = {
  courtId: number;
  bookingDate: string;
  startTime: string;
  duration: number;
  userId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  notes?: string;
  idempotencyKey?: string;
};

export async function createBooking(input: CreateBookingInput) {
  const {
    courtId,
    bookingDate,
    startTime,
    duration,
    userId,
    customerName,
    customerEmail,
    customerPhone,
    paymentMethod = "VIETQR",
    notes,
    idempotencyKey,
  } = input;

  // 1. Validation
  const parsedCourtId = Number(courtId);
  const parsedDuration = Number(duration);

  if (!Number.isInteger(parsedCourtId) || parsedCourtId <= 0) {
    throw new ValidationError("Invalid court ID.");
  }

  if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 3) {
    throw new ValidationError("Duration must be between 1 and 3 hours.");
  }

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(startTime)) {
    throw new ValidationError("Invalid start time format. Expected HH:mm.");
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const normalizedDate = normalizeDateString(bookingDate);
  if (!dateRegex.test(normalizedDate)) {
    throw new ValidationError("Invalid booking date format. Expected YYYY-MM-DD.");
  }

  // Prevent past bookings
  if (isSlotInPast(normalizedDate, startTime)) {
    throw new ValidationError("Cannot book courts in the past. Please select an upcoming time slot.");
  }

  // 2. Idempotency Check
  if (idempotencyKey) {
    const existing = await prisma.booking.findUnique({
      where: { idempotencyKey },
      include: {
        court: { include: { venue: true } },
        user: true,
        payments: true,
      },
    });

    if (existing) {
      return {
        booking: existing,
        isIdempotentReplay: true,
      };
    }
  }

  const endTime = addHoursToTime(startTime, parsedDuration);
  const bookingDateUtc = parseBookingDateMidnight(normalizedDate);

  // 3. Atomic Database Transaction with PostgreSQL Advisory Lock
  const result = await prisma.$transaction(async (tx) => {
    // Acquire transaction-scoped advisory lock for the court + date
    // Prevents concurrent requests from race conditions
    const lockKey = `court-${parsedCourtId}-${normalizedDate}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    // Re-verify court and venue operating hours
    const court = await tx.court.findUnique({
      where: { id: parsedCourtId },
      include: { venue: true },
    });

    if (!court || !court.isActive) {
      throw new NotFoundError("This court is no longer available.");
    }

    const openTime = court.venue.openTime || "06:00";
    const closeTime = court.venue.closeTime || "23:00";

    if (timeToMinutes(startTime) < timeToMinutes(openTime)) {
      throw new ValidationError(
        `Start time is before venue opening hours (${openTime}).`
      );
    }

    if (timeToMinutes(endTime) > timeToMinutes(closeTime)) {
      throw new ValidationError(
        `Booking extends past venue closing hours (${closeTime}).`
      );
    }

    // Check for maintenance overlaps
    const startOfDay = new Date(`${normalizedDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${normalizedDate}T23:59:59.999Z`);

    const maintenanceBlocks = await tx.maintenanceBlock.findMany({
      where: {
        courtId: parsedCourtId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    for (const mb of maintenanceBlocks) {
      if (intervalsOverlap(startTime, endTime, mb.startTime, mb.endTime)) {
        throw new SlotConflictError(
          `This court is scheduled for maintenance from ${mb.startTime} to ${mb.endTime} (${mb.reason || "Maintenance"}).`
        );
      }
    }

    // Check for overlapping active bookings:
    // newStart < existingEnd AND newEnd > existingStart
    // and status != CANCELLED
    const activeBookings = await tx.booking.findMany({
      where: {
        courtId: parsedCourtId,
        bookingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: "CANCELLED",
        },
      },
    });

    for (const b of activeBookings) {
      const bEndTime = b.endTime || addHoursToTime(b.startTime, b.duration);
      if (intervalsOverlap(startTime, endTime, b.startTime, bEndTime)) {
        throw new SlotConflictError(
          `This court was just reserved by another player for ${b.startTime} - ${bEndTime}. Please choose another slot.`
        );
      }
    }

    // Resolve user
    let finalUserId = userId;
    if (!finalUserId) {
      // Find or create customer user
      const targetEmail = customerEmail || "guest@bookme.test";
      const targetName = customerName || "Guest Player";
      const targetPhone = customerPhone || undefined;

      const user = await tx.user.upsert({
        where: { email: targetEmail },
        update: {
          name: targetName,
          phone: targetPhone,
        },
        create: {
          name: targetName,
          email: targetEmail,
          phone: targetPhone,
          role: "CUSTOMER",
        },
      });
      finalUserId = user.id;
    }

    // Server-side live price calculation (prevents client price tampering)
    const pricePerHour = court.priceHour;
    const totalPrice = pricePerHour * parsedDuration;

    // Generate unique human-readable booking code
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const bookingCode = `BK-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    // Create the booking
    const booking = await tx.booking.create({
      data: {
        bookingCode,
        userId: finalUserId,
        courtId: parsedCourtId,
        bookingDate: bookingDateUtc,
        startTime,
        endTime,
        duration: parsedDuration,
        pricePerHour,
        totalPrice,
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        paymentMethod,
        idempotencyKey: idempotencyKey || undefined,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
      },
      include: {
        court: {
          include: {
            venue: true,
          },
        },
        user: true,
        payments: true,
      },
    });

    return booking;
  });

  // Post-commit notification for booking creation
  try {
    await createNotification({
      userId: result.userId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: `Booking Confirmed: Court #${result.court.name}`,
      message: `Your booking ${result.bookingCode} at ${result.court.venue.name} on ${normalizedDate} (${startTime} - ${endTime}) is confirmed!`,
      link: "/bookings",
      metadata: { bookingId: result.id, bookingCode: result.bookingCode },
      idempotencyKey: `booking-${result.id}-created`,
    });
  } catch (err) {
    console.warn("Failed to dispatch booking notification:", err);
  }

  return {
    booking: result,
    isIdempotentReplay: false,
  };
}

// -------------------------------------------------------------
// Cancellation Engine
// -------------------------------------------------------------

export async function cancelBooking(bookingId: number, options?: { cancelledByUserId?: number; reason?: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      court: { include: { venue: true } },
      user: true,
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  if (booking.status === "CANCELLED") {
    return booking; // idempotent
  }

  if (booking.status === "COMPLETED") {
    throw new ValidationError("Cannot cancel a completed booking.");
  }

  // Authorization check if cancelledByUserId is provided
  if (options?.cancelledByUserId) {
    const isCustomer = booking.userId === options.cancelledByUserId;
    const isOwner = booking.court.venue.ownerId === options.cancelledByUserId;
    if (!isCustomer && !isOwner) {
      throw new AuthorizationError("You are not authorized to cancel this booking.");
    }
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancellationReason: options?.reason || booking.cancellationReason || null,
      notes: options?.reason ? `${booking.notes ? booking.notes + " | " : ""}Cancelled: ${options.reason}` : booking.notes,
    },
    include: {
      court: { include: { venue: true } },
      user: true,
      payments: true,
    },
  });

  // Post-commit notification for cancellation
  try {
    const dateStr = updatedBooking.bookingDate.toISOString().split("T")[0];
    await createNotification({
      userId: updatedBooking.userId,
      type: NotificationType.BOOKING_CANCELLED,
      title: `Booking Cancelled: ${updatedBooking.bookingCode}`,
      message: `Your reservation at ${updatedBooking.court.venue.name} for ${dateStr} has been cancelled.`,
      link: "/bookings",
      metadata: { bookingId: updatedBooking.id },
      idempotencyKey: `booking-${updatedBooking.id}-cancelled`,
    });
  } catch (err) {
    console.warn("Failed to dispatch cancellation notification:", err);
  }

  return updatedBooking;
}

// -------------------------------------------------------------
// Payment Engine
// -------------------------------------------------------------

export async function recordPayment(
  bookingId: number,
  options?: {
    transactionRef?: string;
    paymentMethod?: string;
  }
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      court: { include: { venue: true } },
      user: true,
      payments: true,
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  if (booking.paymentStatus === "PAID") {
    return booking;
  }

  const transactionRef =
    options?.transactionRef ||
    `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create verified payment record
    await tx.payment.create({
      data: {
        bookingId,
        amount: booking.totalPrice,
        status: "PAID",
        paymentMethod: options?.paymentMethod || booking.paymentMethod || "VIETQR",
        transactionRef,
        paidAt: new Date(),
      },
    });

    // 2. Update booking paymentStatus
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "PAID",
      },
      include: {
        court: { include: { venue: true } },
        user: true,
        payments: true,
      },
    });

    return updated;
  });

  // Post-commit notification for payment confirmation
  try {
    await createNotification({
      userId: result.userId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: `Payment Verified: ${result.bookingCode}`,
      message: `Payment of ${result.totalPrice.toLocaleString()} VND has been verified for your booking at ${result.court.venue.name}.`,
      link: "/bookings",
      metadata: { bookingId: result.id, transactionRef },
      idempotencyKey: `booking-${result.id}-paid`,
    });
  } catch (err) {
    console.warn("Failed to dispatch payment notification:", err);
  }

  return result;
}
