import { prisma } from "./prisma";
import {
  BookingStatus,
  MatchStatus,
  PaymentStatus,
  ReviewModerationStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { cancelBooking } from "./booking-engine";

// ============================================================================
// 1. AUDIT LOGGING SERVICE
// ============================================================================

export interface LogAdminActionOptions {
  adminId: number;
  action: string; // e.g., "USER_SUSPEND", "USER_REACTIVATE", "VENUE_UPDATE", "COURT_TOGGLE", "BOOKING_CANCEL", "REVIEW_RESOLVE", "SETTINGS_UPDATE"
  resourceType: "USER" | "VENUE" | "COURT" | "BOOKING" | "REVIEW" | "SETTINGS";
  resourceId?: string | number;
  details?: string;
  reason?: string;
}

/**
 * Creates an immutable audit log entry for administrative operations.
 * Security: strictly strips and avoids logging credentials, tokens, or sensitive secrets.
 */
export async function logAdminAction(options: LogAdminActionOptions) {
  try {
    return await prisma.auditLog.create({
      data: {
        adminId: options.adminId,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId ? String(options.resourceId) : null,
        details: options.details ? options.details.slice(0, 1000) : null,
        reason: options.reason ? options.reason.slice(0, 500) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}

/**
 * Retrieves paginated audit logs with admin user details.
 */
export async function getAuditLogs(options?: {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  adminId?: number;
  search?: string;
}) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.action && options.action !== "ALL") {
    whereClause.action = options.action;
  }
  if (options?.resourceType && options.resourceType !== "ALL") {
    whereClause.resourceType = options.resourceType;
  }
  if (options?.adminId) {
    whereClause.adminId = options.adminId;
  }
  if (options?.search && options.search.trim()) {
    const q = options.search.trim();
    whereClause.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
      { reason: { contains: q, mode: "insensitive" } },
      { resourceId: { contains: q, mode: "insensitive" } },
      { admin: { name: { contains: q, mode: "insensitive" } } },
      { admin: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [totalCount, logs] = await Promise.all([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.findMany({
      where: whereClause,
      include: {
        admin: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    logs,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

// ============================================================================
// 2. PLATFORM CONFIGURATION SERVICE
// ============================================================================

export interface PlatformConfigData {
  platformName: string;
  contactEmail: string;
  contactPhone: string;
  defaultTimezone: string;
  defaultCurrency: string;
  cancellationPolicy: string;
  minBookingDuration: number;
  maxBookingDuration: number;
  defaultMaxMatchPlayers: number;
}

/**
 * Retrieves the singleton platform configuration row, creating defaults if missing.
 */
export async function getPlatformConfig() {
  let config = await prisma.platformConfig.findUnique({
    where: { id: 1 },
    include: {
      updatedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!config) {
    config = await prisma.platformConfig.create({
      data: {
        id: 1,
        platformName: "BookMeBadminton",
        contactEmail: "support@bookmebadminton.com",
        contactPhone: "+84 901 234 567",
        defaultTimezone: "Asia/Ho_Chi_Minh",
        defaultCurrency: "VND",
        cancellationPolicy: "Free cancellation up to 6 hours before slot start time.",
        minBookingDuration: 1,
        maxBookingDuration: 4,
        defaultMaxMatchPlayers: 4,
      },
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  return config;
}

/**
 * Validates and updates platform configuration, logging an administrative audit entry.
 */
export async function updatePlatformConfig(
  adminId: number,
  data: Partial<PlatformConfigData>,
  reason?: string
) {
  // Server-side validation
  if (data.platformName !== undefined && data.platformName.trim().length === 0) {
    throw new Error("Platform name cannot be empty.");
  }
  if (data.contactEmail !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactEmail)) {
      throw new Error("Invalid contact email format.");
    }
  }
  if (data.minBookingDuration !== undefined && (data.minBookingDuration < 1 || data.minBookingDuration > 6)) {
    throw new Error("Minimum booking duration must be between 1 and 6 hours.");
  }
  if (data.maxBookingDuration !== undefined && (data.maxBookingDuration < 1 || data.maxBookingDuration > 12)) {
    throw new Error("Maximum booking duration must be between 1 and 12 hours.");
  }
  if (
    data.minBookingDuration !== undefined &&
    data.maxBookingDuration !== undefined &&
    data.minBookingDuration > data.maxBookingDuration
  ) {
    throw new Error("Minimum duration cannot exceed maximum duration.");
  }
  if (
    data.defaultMaxMatchPlayers !== undefined &&
    (data.defaultMaxMatchPlayers < 2 || data.defaultMaxMatchPlayers > 20)
  ) {
    throw new Error("Match participation limit must be between 2 and 20 players.");
  }

  const updated = await prisma.platformConfig.upsert({
    where: { id: 1 },
    update: {
      ...data,
      updatedById: adminId,
    },
    create: {
      id: 1,
      platformName: data.platformName || "BookMeBadminton",
      contactEmail: data.contactEmail || "support@bookmebadminton.com",
      contactPhone: data.contactPhone || "+84 901 234 567",
      defaultTimezone: data.defaultTimezone || "Asia/Ho_Chi_Minh",
      defaultCurrency: data.defaultCurrency || "VND",
      cancellationPolicy: data.cancellationPolicy || "Free cancellation up to 6 hours before slot start time.",
      minBookingDuration: data.minBookingDuration || 1,
      maxBookingDuration: data.maxBookingDuration || 4,
      defaultMaxMatchPlayers: data.defaultMaxMatchPlayers || 4,
      updatedById: adminId,
    },
    include: {
      updatedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logAdminAction({
    adminId,
    action: "SETTINGS_UPDATE",
    resourceType: "SETTINGS",
    resourceId: "1",
    details: JSON.stringify(data),
    reason: reason || "Platform operational configuration update",
  });

  return updated;
}

// ============================================================================
// 3. ADMIN OVERVIEW KPIS & PLATFORM ANALYTICS
// ============================================================================

export async function getAdminOverviewKPIs(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  let dateFilter: any = {};
  if (options?.startDate || options?.endDate) {
    if (options.startDate) {
      dateFilter.gte = new Date(`${options.startDate}T00:00:00.000Z`);
    }
    if (options.endDate) {
      dateFilter.lte = new Date(`${options.endDate}T23:59:59.999Z`);
    }
  }

  // 1. Core Platform Counts
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalVenues,
    activeVenues,
    totalCourts,
    activeCourts,
    totalBookings,
    upcomingBookings,
    cancelledBookings,
    completedBookings,
    totalMatches,
    openMatches,
    completedMatches,
    pendingReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
    prisma.venue.count(),
    prisma.venue.count({ where: { isActive: true } }),
    prisma.court.count(),
    prisma.court.count({ where: { isActive: true } }),
    prisma.booking.count({ where: dateFilter.gte || dateFilter.lte ? { bookingDate: dateFilter } : {} }),
    prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
        bookingDate: { gte: startOfDay },
      },
    }),
    prisma.booking.count({
      where: {
        status: BookingStatus.CANCELLED,
        ...(dateFilter.gte || dateFilter.lte ? { bookingDate: dateFilter } : {}),
      },
    }),
    prisma.booking.count({
      where: {
        status: BookingStatus.COMPLETED,
        ...(dateFilter.gte || dateFilter.lte ? { bookingDate: dateFilter } : {}),
      },
    }),
    prisma.match.count(),
    prisma.match.count({ where: { status: MatchStatus.OPEN } }),
    prisma.match.count({ where: { status: MatchStatus.COMPLETED } }),
    prisma.reviewReport.count({ where: { status: "PENDING" } }),
  ]);

  // 2. Verified Revenue calculation strictly from persisted PAID payments
  const paidPayments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
      booking: {
        status: { not: BookingStatus.CANCELLED },
        ...(dateFilter.gte || dateFilter.lte ? { bookingDate: dateFilter } : {}),
      },
    },
    select: { amount: true },
  });
  const verifiedPaidRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  // Non-cancelled bookings gross value
  const validBookings = await prisma.booking.findMany({
    where: {
      status: { not: BookingStatus.CANCELLED },
      ...(dateFilter.gte || dateFilter.lte ? { bookingDate: dateFilter } : {}),
    },
    select: { totalPrice: true },
  });
  const totalBookingValue = validBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const outstandingBalance = Math.max(0, totalBookingValue - verifiedPaidRevenue);

  // 3. User Registration Trend (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const registrationMap = new Map<string, number>();
  for (const u of recentUsers) {
    const day = u.createdAt.toISOString().slice(0, 10);
    registrationMap.set(day, (registrationMap.get(day) || 0) + 1);
  }
  const userRegistrationTrend = Array.from(registrationMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // 4. Booking Status Distribution
  const bookingStatusDistribution = [
    { status: "CONFIRMED", count: totalBookings - cancelledBookings - completedBookings },
    { status: "COMPLETED", count: completedBookings },
    { status: "CANCELLED", count: cancelledBookings },
  ];

  // 5. Popular Venues
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
      location: true,
      currency: true,
      isActive: true,
      courts: {
        select: {
          id: true,
          _count: {
            select: { bookings: true },
          },
        },
      },
      _count: {
        select: {
          courts: true,
          matches: true,
        },
      },
    },
    take: 10,
  });

  const venuesWithCounts = venues
    .map((v) => {
      const totalCourtBookings = v.courts.reduce((sum, c) => sum + c._count.bookings, 0);
      return {
        id: v.id,
        name: v.name,
        location: v.location,
        currency: v.currency,
        isActive: v.isActive,
        _count: {
          courts: v._count.courts,
          bookings: totalCourtBookings,
          matches: v._count.matches,
        },
      };
    })
    .sort((a, b) => b._count.bookings - a._count.bookings)
    .slice(0, 5);

  // 6. Peak Booking Days & Hours
  const recentBookings = await prisma.booking.findMany({
    where: {
      status: { not: BookingStatus.CANCELLED },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { bookingDate: true, startTime: true },
  });

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hourlyCounts = new Map<string, number>();

  for (const b of recentBookings) {
    const day = new Date(b.bookingDate).getDay();
    weekdayCounts[day] += 1;

    const hour = b.startTime.slice(0, 2) + ":00";
    hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
  }

  const peakWeekdays = weekdayNames.map((name, idx) => ({
    dayOfWeek: idx,
    dayName: name,
    count: weekdayCounts[idx],
  }));

  const peakHours = Array.from(hourlyCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return {
    kpis: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalVenues,
      activeVenues,
      totalCourts,
      activeCourts,
      totalBookings,
      upcomingBookings,
      cancelledBookings,
      completedBookings,
      cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
      totalMatches,
      openMatches,
      completedMatches,
      pendingReports,
      verifiedPaidRevenue,
      totalBookingValue,
      outstandingBalance,
      currency: "VND",
    },
    trends: {
      userRegistrationTrend,
      bookingStatusDistribution,
      popularVenues: venuesWithCounts,
      peakWeekdays,
      peakHours,
    },
  };
}

// ============================================================================
// 4. USER MANAGEMENT SERVICE
// ============================================================================

export async function getAdminUsers(options?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: "createdAt" | "name" | "email";
  sortOrder?: "asc" | "desc";
}) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.role && options.role !== "ALL") {
    whereClause.role = options.role as UserRole;
  }
  if (options?.status && options.status !== "ALL") {
    whereClause.status = options.status as UserStatus;
  }
  if (options?.search && options.search.trim()) {
    const q = options.search.trim();
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const sortBy = options?.sortBy || "createdAt";
  const sortOrder = options?.sortOrder || "desc";

  const [totalCount, users] = await Promise.all([
    prisma.user.count({ where: whereClause }),
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        suspendedAt: true,
        suspensionReason: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            createdMatches: true,
            matchParticipants: true,
            ownedVenues: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return {
    users,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

/**
 * Suspends or reactivates a user account with mandatory reason and audit log.
 * Prevents self-lockout by active administrators.
 */
export async function toggleUserSuspension(
  adminId: number,
  targetUserId: number,
  action: "SUSPEND" | "REACTIVATE",
  reason: string
) {
  if (adminId === targetUserId) {
    throw new Error("Administrators cannot suspend their own active account.");
  }
  if (!reason || reason.trim().length < 3) {
    throw new Error("A valid reason (minimum 3 characters) is required.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser) {
    throw new Error("User not found.");
  }

  const newStatus = action === "SUSPEND" ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      status: newStatus,
      suspendedAt: action === "SUSPEND" ? new Date() : null,
      suspensionReason: action === "SUSPEND" ? reason : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      suspendedAt: true,
      suspensionReason: true,
    },
  });

  await logAdminAction({
    adminId,
    action: action === "SUSPEND" ? "USER_SUSPEND" : "USER_REACTIVATE",
    resourceType: "USER",
    resourceId: targetUserId,
    details: `Status set to ${newStatus} for user ${targetUser.email} (${targetUser.name})`,
    reason,
  });

  return updatedUser;
}

// ============================================================================
// 5. VENUE & COURT ACTIVATION / DEACTIVATION SAFETY
// ============================================================================

/**
 * Safely toggles venue active state.
 * Refuses deactivation if upcoming confirmed bookings exist.
 */
export async function toggleVenueActive(
  adminId: number,
  venueId: number,
  isActive: boolean,
  reason?: string
) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { courts: true },
  });
  if (!venue) {
    throw new Error("Venue not found.");
  }

  if (!isActive) {
    // Check for future active bookings
    const now = new Date();
    const futureBookings = await prisma.booking.count({
      where: {
        court: { venueId },
        status: BookingStatus.CONFIRMED,
        bookingDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0) },
      },
    });

    if (futureBookings > 0) {
      throw new Error(
        `Cannot deactivate venue: there are ${futureBookings} upcoming confirmed bookings. Please cancel or reschedule them first.`
      );
    }
  }

  const updatedVenue = await prisma.venue.update({
    where: { id: venueId },
    data: { isActive },
  });

  await logAdminAction({
    adminId,
    action: isActive ? "VENUE_ACTIVATE" : "VENUE_DEACTIVATE",
    resourceType: "VENUE",
    resourceId: venueId,
    details: `Venue ${venue.name} isActive set to ${isActive}`,
    reason: reason || (isActive ? "Venue reactivated by administrator" : "Venue deactivated by administrator"),
  });

  return updatedVenue;
}

/**
 * Safely toggles court active state.
 * Refuses deactivation if upcoming confirmed bookings exist.
 */
export async function toggleCourtActive(
  adminId: number,
  courtId: number,
  isActive: boolean,
  reason?: string
) {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { venue: true },
  });
  if (!court) {
    throw new Error("Court not found.");
  }

  if (!isActive) {
    const now = new Date();
    const futureBookings = await prisma.booking.count({
      where: {
        courtId,
        status: BookingStatus.CONFIRMED,
        bookingDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0) },
      },
    });

    if (futureBookings > 0) {
      throw new Error(
        `Cannot deactivate court: there are ${futureBookings} upcoming confirmed bookings. Please cancel or reschedule them first.`
      );
    }
  }

  const updatedCourt = await prisma.court.update({
    where: { id: courtId },
    data: { isActive },
  });

  await logAdminAction({
    adminId,
    action: isActive ? "COURT_ACTIVATE" : "COURT_DEACTIVATE",
    resourceType: "COURT",
    resourceId: courtId,
    details: `Court ${court.name} (Venue: ${court.venue.name}) isActive set to ${isActive}`,
    reason: reason || (isActive ? "Court reactivated by administrator" : "Court deactivated by administrator"),
  });

  return updatedCourt;
}

// ============================================================================
// 6. REVIEW MODERATION SERVICE
// ============================================================================

export async function getReviewReports(options?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.status && options.status !== "ALL") {
    whereClause.status = options.status;
  }

  const [totalCount, reports] = await Promise.all([
    prisma.reviewReport.count({ where: whereClause }),
    prisma.reviewReport.findMany({
      where: whereClause,
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true },
        },
        review: {
          include: {
            reviewer: { select: { id: true, name: true, email: true } },
            recipient: { select: { id: true, name: true, email: true } },
            match: { select: { id: true, title: true, date: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    reports,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

export async function resolveReviewReport(
  adminId: number,
  reportId: number,
  options: {
    action: "REVIEW_HIDDEN" | "DISMISSED";
    reason: string;
  }
) {
  if (!options.reason || options.reason.trim().length < 3) {
    throw new Error("A resolution reason (minimum 3 characters) is required.");
  }

  const report = await prisma.reviewReport.findUnique({
    where: { id: reportId },
    include: { review: true },
  });
  if (!report) {
    throw new Error("Review report not found.");
  }

  // Update report resolution
  const resolved = await prisma.reviewReport.update({
    where: { id: reportId },
    data: {
      status: "RESOLVED",
      actionTaken: options.action,
      resolutionNotes: options.reason,
      resolvedAt: new Date(),
      resolvedById: adminId,
    },
  });

  // If action is REVIEW_HIDDEN, hide the review
  if (options.action === "REVIEW_HIDDEN") {
    await prisma.playerReview.update({
      where: { id: report.reviewId },
      data: {
        moderationStatus: ReviewModerationStatus.REMOVED,
      },
    });
  }

  await logAdminAction({
    adminId,
    action: "REVIEW_RESOLVE",
    resourceType: "REVIEW",
    resourceId: report.reviewId,
    details: `Report #${reportId} resolved with action ${options.action}`,
    reason: options.reason,
  });

  return resolved;
}

// ============================================================================
// 7. VENUE & COURT ADMINISTRATION
// ============================================================================

export async function getAdminVenues(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.status === "ACTIVE") {
    whereClause.isActive = true;
  } else if (options?.status === "INACTIVE") {
    whereClause.isActive = false;
  }
  if (options?.search && options.search.trim()) {
    const q = options.search.trim();
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }

  const [totalCount, venues] = await Promise.all([
    prisma.venue.count({ where: whereClause }),
    prisma.venue.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        courts: {
          select: {
            id: true,
            name: true,
            priceHour: true,
            surface: true,
            isActive: true,
            _count: {
              select: { bookings: true },
            },
          },
          orderBy: { id: "asc" },
        },
        _count: {
          select: {
            courts: true,
            matches: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const formattedVenues = venues.map((v) => ({
    ...v,
    _count: {
      courts: v._count.courts,
      matches: v._count.matches,
      bookings: v.courts.reduce((sum, c) => sum + (c._count?.bookings || 0), 0),
    },
  }));

  return {
    venues: formattedVenues,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

export async function createAdminVenue(
  adminId: number,
  data: {
    name: string;
    location: string;
    address?: string;
    description?: string;
    imageUrl?: string;
    openTime?: string;
    closeTime?: string;
    currency?: string;
    ownerId?: number;
    initialCourtCount?: number;
    initialCourtPrice?: number;
  }
) {
  if (!data.name || !data.name.trim()) {
    throw new Error("Venue name is required.");
  }
  if (!data.location || !data.location.trim()) {
    throw new Error("Venue location is required.");
  }

  const venue = await prisma.venue.create({
    data: {
      name: data.name.trim(),
      location: data.location.trim(),
      address: data.address?.trim() || null,
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      openTime: data.openTime || "06:00",
      closeTime: data.closeTime || "23:00",
      currency: data.currency || "VND",
      ownerId: data.ownerId || null,
      isActive: true,
      courts:
        data.initialCourtCount && data.initialCourtCount > 0
          ? {
              create: Array.from({ length: data.initialCourtCount }, (_, i) => ({
                name: `Court ${i + 1}`,
                priceHour: data.initialCourtPrice || 120000,
                surface: "Taraflex Pro Turf",
                isActive: true,
              })),
            }
          : undefined,
    },
    include: {
      courts: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAdminAction({
    adminId,
    action: "VENUE_CREATE",
    resourceType: "VENUE",
    resourceId: venue.id,
    details: `Created venue "${venue.name}" at ${venue.location} with ${venue.courts.length} court(s)`,
    reason: "New venue onboarded by administrator",
  });

  return venue;
}

export async function updateAdminVenue(
  adminId: number,
  venueId: number,
  data: {
    name?: string;
    location?: string;
    address?: string;
    description?: string;
    imageUrl?: string;
    openTime?: string;
    closeTime?: string;
    currency?: string;
    ownerId?: number | null;
  },
  reason?: string
) {
  const existing = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!existing) {
    throw new Error("Venue not found.");
  }

  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.location !== undefined && { location: data.location.trim() }),
      ...(data.address !== undefined && { address: data.address.trim() || null }),
      ...(data.description !== undefined && { description: data.description.trim() || null }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl.trim() || null }),
      ...(data.openTime !== undefined && { openTime: data.openTime }),
      ...(data.closeTime !== undefined && { closeTime: data.closeTime }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
    },
    include: {
      courts: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await logAdminAction({
    adminId,
    action: "VENUE_UPDATE",
    resourceType: "VENUE",
    resourceId: venueId,
    details: `Updated venue details for "${updated.name}"`,
    reason: reason || "Venue details modified by administrator",
  });

  return updated;
}

export async function createAdminCourt(
  adminId: number,
  venueId: number,
  data: {
    name: string;
    priceHour: number;
    surface?: string;
    isActive?: boolean;
  }
) {
  if (!data.name || !data.name.trim()) {
    throw new Error("Court name is required.");
  }
  if (!data.priceHour || data.priceHour <= 0) {
    throw new Error("Court price per hour must be greater than 0.");
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    throw new Error("Venue not found.");
  }

  const court = await prisma.court.create({
    data: {
      venueId,
      name: data.name.trim(),
      priceHour: data.priceHour,
      surface: data.surface?.trim() || "Taraflex Pro Turf",
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  await logAdminAction({
    adminId,
    action: "COURT_CREATE",
    resourceType: "COURT",
    resourceId: court.id,
    details: `Added court "${court.name}" (${court.priceHour} VND/hr) to venue "${venue.name}"`,
    reason: "New court added by administrator",
  });

  return court;
}

export async function updateAdminCourt(
  adminId: number,
  courtId: number,
  data: {
    name?: string;
    priceHour?: number;
    surface?: string;
    isActive?: boolean;
  },
  reason?: string
) {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { venue: true },
  });
  if (!court) {
    throw new Error("Court not found.");
  }

  if (data.isActive === false && court.isActive === true) {
    const now = new Date();
    const futureBookings = await prisma.booking.count({
      where: {
        courtId,
        status: BookingStatus.CONFIRMED,
        bookingDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0) },
      },
    });

    if (futureBookings > 0) {
      throw new Error(
        `Cannot deactivate court: there are ${futureBookings} upcoming confirmed bookings.`
      );
    }
  }

  const updated = await prisma.court.update({
    where: { id: courtId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.priceHour !== undefined && { priceHour: data.priceHour }),
      ...(data.surface !== undefined && { surface: data.surface.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await logAdminAction({
    adminId,
    action: "COURT_UPDATE",
    resourceType: "COURT",
    resourceId: courtId,
    details: `Updated court "${updated.name}" in venue "${court.venue.name}"`,
    reason: reason || "Court configuration updated by administrator",
  });

  return updated;
}

// ============================================================================
// 8. BOOKING ADMINISTRATION & CANCELLATION
// ============================================================================

export async function getAdminBookings(options?: {
  page?: number;
  limit?: number;
  search?: string;
  venueId?: number;
  courtId?: number;
  date?: string;
  status?: string;
  paymentStatus?: string;
}) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.venueId) {
    whereClause.court = { venueId: options.venueId };
  }
  if (options?.courtId) {
    whereClause.courtId = options.courtId;
  }
  if (options?.status && options.status !== "ALL") {
    whereClause.status = options.status as BookingStatus;
  }
  if (options?.paymentStatus && options.paymentStatus !== "ALL") {
    whereClause.paymentStatus = options.paymentStatus as PaymentStatus;
  }
  if (options?.date) {
    const d = new Date(`${options.date}T00:00:00.000Z`);
    const nextD = new Date(`${options.date}T23:59:59.999Z`);
    whereClause.bookingDate = { gte: d, lte: nextD };
  }
  if (options?.search && options.search.trim()) {
    const q = options.search.trim();
    whereClause.OR = [
      { bookingCode: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { court: { name: { contains: q, mode: "insensitive" } } },
      { court: { venue: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [totalCount, bookings] = await Promise.all([
    prisma.booking.count({ where: whereClause }),
    prisma.booking.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        court: {
          include: {
            venue: {
              select: { id: true, name: true, location: true, currency: true },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            transactionRef: true,
            paymentMethod: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    bookings,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

export async function adminCancelBooking(
  adminId: number,
  bookingId: number,
  reason: string
) {
  if (!reason || reason.trim().length < 3) {
    throw new Error("A cancellation reason (minimum 3 characters) is required.");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      court: { include: { venue: true } },
      user: true,
    },
  });
  if (!booking) {
    throw new Error("Booking not found.");
  }
  if (booking.status === BookingStatus.CANCELLED) {
    return booking;
  }
  if (booking.status === BookingStatus.COMPLETED) {
    throw new Error("Cannot cancel a completed booking.");
  }

  const cancelled = await cancelBooking(bookingId, {
    reason: `[ADMIN CANCEL] ${reason.trim()}`,
  });

  await logAdminAction({
    adminId,
    action: "BOOKING_CANCEL",
    resourceType: "BOOKING",
    resourceId: bookingId,
    details: `Booking ${booking.bookingCode} for court ${booking.court.name} (${booking.court.venue.name}) cancelled by administrator`,
    reason: reason.trim(),
  });

  return cancelled;
}

// ============================================================================
// 9. MATCH MODERATION & MANAGEMENT
// ============================================================================

export async function getAdminMatches(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  venueId?: number;
}) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.status && options.status !== "ALL") {
    whereClause.status = options.status as MatchStatus;
  }
  if (options?.venueId) {
    whereClause.venueId = options.venueId;
  }
  if (options?.search && options.search.trim()) {
    const q = options.search.trim();
    whereClause.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { creator: { name: { contains: q, mode: "insensitive" } } },
      { creator: { email: { contains: q, mode: "insensitive" } } },
      { venue: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [totalCount, matches] = await Promise.all([
    prisma.match.count({ where: whereClause }),
    prisma.match.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        venue: { select: { id: true, name: true, location: true } },
        court: { select: { id: true, name: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    matches,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}
