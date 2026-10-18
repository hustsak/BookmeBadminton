import { prisma } from "./prisma";
import { BookingStatus, PaymentStatus, UserRole } from "@prisma/client";

export type DateFilterPreset =
  | "today"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateFilterPreset;
}

export interface MetricWithComparison {
  value: number;
  previousValue: number;
  changePercent: number | null; // e.g. +15.5 or -5.2
  formatted?: string;
  formattedPrevious?: string;
}

export interface OwnerOverviewKPIs {
  dateRange: {
    start: string;
    end: string;
    preset: DateFilterPreset;
  };
  previousDateRange: {
    start: string;
    end: string;
  };
  currency: string;
  bookingRevenue: MetricWithComparison; // Total booking value for non-cancelled bookings
  confirmedPaidRevenue: MetricWithComparison; // Persisted PAID payments for non-cancelled bookings
  outstandingPayments: MetricWithComparison; // Booking value minus collected revenue
  refundedAmount: MetricWithComparison; // Persisted REFUNDED payments
  totalBookings: MetricWithComparison;
  confirmedBookings: MetricWithComparison;
  cancelledBookings: MetricWithComparison;
  cancellationRate: MetricWithComparison; // Percentage
  courtUtilizationRate: MetricWithComparison; // Percentage
  averageRevenuePerBooking: MetricWithComparison; // Confirmed revenue / confirmed bookings
  totalBookedHours: MetricWithComparison;
  totalAvailableHours: MetricWithComparison;
  totalMaintenanceHours: MetricWithComparison;
}

export interface RevenueTrendItem {
  date: string;
  label: string;
  collectedRevenue: number;
  bookingValue: number;
  outstandingBalance: number;
  bookingsCount: number;
}

export interface RevenueByCourtItem {
  courtId: number;
  courtName: string;
  venueId: number;
  venueName: string;
  collectedRevenue: number;
  bookingValue: number;
  bookingsCount: number;
  utilizationRate: number;
}

export interface RevenueByPaymentMethodItem {
  method: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface CourtUtilizationItem {
  courtId: number;
  courtName: string;
  venueId: number;
  venueName: string;
  pricePerHour: number;
  bookedHours: number;
  availableHours: number;
  maintenanceHours: number;
  utilizationRate: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  revenueCollected: number;
  averageBookingValue: number;
}

export interface PeakHoursAnalysis {
  weekdayBreakdown: {
    dayOfWeek: number; // 0 = Sun, 1 = Mon ...
    dayName: string;
    bookedHours: number;
    bookingsCount: number;
    utilizationPercent: number;
  }[];
  hourlyBreakdown: {
    hour: string; // "06:00"
    bookingCount: number;
    percentage: number;
  }[];
  popularTimeSlots: {
    hour: string;
    bookingCount: number;
    label: string;
  }[];
  leastUtilizedTimeSlots: {
    hour: string;
    bookingCount: number;
    label: string;
  }[];
  averageLeadTimeHours: number;
  averageLeadTimeDays: number;
}

/**
 * Resolves a date filter preset into start and end Dates, and calculates the preceding comparison period.
 */
export function resolveDateRange(
  preset: DateFilterPreset = "last30days",
  customStart?: string,
  customEnd?: string
): { current: DateRange; previous: DateRange } {
  const now = new Date();

  let startDate: Date;
  let endDate: Date;

  if (preset === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (preset === "last7days") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (preset === "last30days") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (preset === "thisMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (preset === "lastMonth") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (preset === "custom" && customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    startDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
    endDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);

    // Safeguard max window to 365 days
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays > 366) {
      startDate = new Date(endDate.getTime() - 365 * 24 * 3600 * 1000);
    }
  } else {
    // Default fallback to last 30 days
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    preset = "last30days";
  }

  // Calculate preceding equivalent period
  const durationMs = endDate.getTime() - startDate.getTime() + 1;
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);

  return {
    current: { startDate, endDate, preset },
    previous: { startDate: prevStart, endDate: prevEnd, preset: "custom" },
  };
}

/**
 * Parses time strings like "06:00" or "23:00" into float hours (e.g. 6.0, 23.0).
 */
export function parseHourStringToFloat(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

/**
 * Calculates percentage growth / change between current and previous values.
 */
export function calculateChangePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : current === 0 ? 0 : -100;
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return Math.round(change * 10) / 10;
}

export class ForbiddenError extends Error {
  code = "FORBIDDEN";
  constructor(message: string = "Access denied. You do not own this venue.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Verifies owner access to venues and returns owned venue IDs.
 */
export async function getOwnerTargetVenues(
  ownerId: number,
  userRole: UserRole,
  requestedVenueId?: number
): Promise<{ ownedVenueIds: number[]; targetVenueIds: number[]; currency: string }> {
  const whereClause: any = {};
  if (userRole !== UserRole.ADMIN) {
    whereClause.ownerId = ownerId;
  }

  const ownedVenues = await prisma.venue.findMany({
    where: whereClause,
    select: { id: true, currency: true },
  });

  const ownedVenueIds = ownedVenues.map((v) => v.id);
  const currency = ownedVenues[0]?.currency || "VND";

  if (ownedVenueIds.length === 0) {
    if (requestedVenueId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError("Access denied. You do not own this venue.");
    }
    return { ownedVenueIds: [], targetVenueIds: [], currency };
  }

  if (requestedVenueId) {
    if (!ownedVenueIds.includes(requestedVenueId) && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError("Access denied. You do not own this venue.");
    }
    const selectedVenue = ownedVenues.find((v) => v.id === requestedVenueId);
    return {
      ownedVenueIds,
      targetVenueIds: [requestedVenueId],
      currency: selectedVenue?.currency || currency,
    };
  }

  return { ownedVenueIds, targetVenueIds: ownedVenueIds, currency };
}

/**
 * Computes KPIs for a single period across target venues.
 */
async function computePeriodKPIs(targetVenueIds: number[], startDate: Date, endDate: Date) {
  if (targetVenueIds.length === 0) {
    return {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      cancellationRate: 0,
      bookingRevenue: 0,
      confirmedPaidRevenue: 0,
      outstandingPayments: 0,
      refundedAmount: 0,
      averageRevenuePerBooking: 0,
      totalBookedHours: 0,
      totalAvailableHours: 0,
      totalMaintenanceHours: 0,
      courtUtilizationRate: 0,
    };
  }

  // 1. Fetch bookings in date range
  const bookings = await prisma.booking.findMany({
    where: {
      court: { venueId: { in: targetVenueIds } },
      bookingDate: { gte: startDate, lte: endDate },
    },
    include: {
      payments: true,
      court: { select: { id: true, venueId: true } },
    },
  });

  // 2. Fetch courts and venues for available hours & maintenance calculation
  const courts = await prisma.court.findMany({
    where: { venueId: { in: targetVenueIds }, isActive: true },
    include: {
      venue: { select: { id: true, openTime: true, closeTime: true } },
      maintenanceBlocks: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
      },
    },
  });

  // Booking counts
  const totalBookings = bookings.length;
  const confirmedBookingsList = bookings.filter(
    (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED
  );
  const confirmedBookings = confirmedBookingsList.length;
  const cancelledBookings = bookings.filter((b) => b.status === BookingStatus.CANCELLED).length;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 1000) / 10 : 0;

  // Revenue calculations:
  // - Booking Revenue (Total Value): sum of totalPrice of non-cancelled bookings
  let bookingRevenue = 0;
  let confirmedPaidRevenue = 0;
  let refundedAmount = 0;

  for (const b of bookings) {
    // Collect all refunded payments regardless of status
    for (const p of b.payments) {
      if (p.status === PaymentStatus.REFUNDED) {
        refundedAmount += p.amount;
      }
    }

    if (b.status === BookingStatus.CANCELLED) {
      continue; // Exclude cancelled bookings from valid revenue
    }

    bookingRevenue += b.totalPrice;

    // Persisted PAID payments
    for (const p of b.payments) {
      if (p.status === PaymentStatus.PAID) {
        confirmedPaidRevenue += p.amount;
      }
    }
  }

  const outstandingPayments = Math.max(0, bookingRevenue - confirmedPaidRevenue);
  const averageRevenuePerBooking =
    confirmedBookings > 0 ? Math.round(confirmedPaidRevenue / confirmedBookings) : 0;

  // Utilization calculation
  let totalBookedHours = 0;
  for (const b of confirmedBookingsList) {
    totalBookedHours += b.duration || 1;
  }

  // Calculate Available Hours across courts and days
  let totalAvailableHours = 0;
  let totalMaintenanceHours = 0;

  const dayCount = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
  );

  for (const court of courts) {
    const openH = parseHourStringToFloat(court.venue.openTime || "06:00");
    const closeH = parseHourStringToFloat(court.venue.closeTime || "23:00");
    const dailyOperatingHours = Math.max(0, closeH - openH);

    // Sum maintenance hours on this court in date range
    let courtMaintHours = 0;
    for (const mb of court.maintenanceBlocks) {
      const sH = parseHourStringToFloat(mb.startTime);
      const eH = parseHourStringToFloat(mb.endTime);
      courtMaintHours += Math.max(0, eH - sH);
    }
    totalMaintenanceHours += courtMaintHours;

    const courtOperatingTotal = dailyOperatingHours * dayCount;
    const courtAvailableHours = Math.max(0, courtOperatingTotal - courtMaintHours);
    totalAvailableHours += courtAvailableHours;
  }

  // Calculate court utilization rate capped at 100%
  const courtUtilizationRate =
    totalAvailableHours > 0
      ? Math.min(100, Math.round((totalBookedHours / totalAvailableHours) * 1000) / 10)
      : 0;

  return {
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    cancellationRate,
    bookingRevenue,
    confirmedPaidRevenue,
    outstandingPayments,
    refundedAmount,
    averageRevenuePerBooking,
    totalBookedHours,
    totalAvailableHours,
    totalMaintenanceHours,
    courtUtilizationRate,
  };
}

/**
 * Calculates complete business overview KPIs with comparison against previous equivalent period.
 */
export async function getOwnerOverviewKPIs(
  ownerId: number,
  userRole: UserRole,
  options?: {
    preset?: DateFilterPreset;
    startDate?: string;
    endDate?: string;
    venueId?: number;
  }
): Promise<OwnerOverviewKPIs> {
  const { targetVenueIds, currency } = await getOwnerTargetVenues(
    ownerId,
    userRole,
    options?.venueId
  );

  const { current, previous } = resolveDateRange(
    options?.preset,
    options?.startDate,
    options?.endDate
  );

  const [currentKPIs, prevKPIs] = await Promise.all([
    computePeriodKPIs(targetVenueIds, current.startDate, current.endDate),
    computePeriodKPIs(targetVenueIds, previous.startDate, previous.endDate),
  ]);

  const makeMetric = (curr: number, prev: number): MetricWithComparison => ({
    value: curr,
    previousValue: prev,
    changePercent: calculateChangePercent(curr, prev),
  });

  return {
    dateRange: {
      start: current.startDate.toISOString().slice(0, 10),
      end: current.endDate.toISOString().slice(0, 10),
      preset: current.preset,
    },
    previousDateRange: {
      start: previous.startDate.toISOString().slice(0, 10),
      end: previous.endDate.toISOString().slice(0, 10),
    },
    currency,
    bookingRevenue: makeMetric(currentKPIs.bookingRevenue, prevKPIs.bookingRevenue),
    confirmedPaidRevenue: makeMetric(currentKPIs.confirmedPaidRevenue, prevKPIs.confirmedPaidRevenue),
    outstandingPayments: makeMetric(currentKPIs.outstandingPayments, prevKPIs.outstandingPayments),
    refundedAmount: makeMetric(currentKPIs.refundedAmount, prevKPIs.refundedAmount),
    totalBookings: makeMetric(currentKPIs.totalBookings, prevKPIs.totalBookings),
    confirmedBookings: makeMetric(currentKPIs.confirmedBookings, prevKPIs.confirmedBookings),
    cancelledBookings: makeMetric(currentKPIs.cancelledBookings, prevKPIs.cancelledBookings),
    cancellationRate: makeMetric(currentKPIs.cancellationRate, prevKPIs.cancellationRate),
    courtUtilizationRate: makeMetric(currentKPIs.courtUtilizationRate, prevKPIs.courtUtilizationRate),
    averageRevenuePerBooking: makeMetric(
      currentKPIs.averageRevenuePerBooking,
      prevKPIs.averageRevenuePerBooking
    ),
    totalBookedHours: makeMetric(currentKPIs.totalBookedHours, prevKPIs.totalBookedHours),
    totalAvailableHours: makeMetric(currentKPIs.totalAvailableHours, prevKPIs.totalAvailableHours),
    totalMaintenanceHours: makeMetric(currentKPIs.totalMaintenanceHours, prevKPIs.totalMaintenanceHours),
  };
}

/**
 * Computes revenue breakdown over time (daily, weekly, monthly), by court, and by payment method.
 */
export async function getOwnerRevenueAnalytics(
  ownerId: number,
  userRole: UserRole,
  options?: {
    preset?: DateFilterPreset;
    startDate?: string;
    endDate?: string;
    venueId?: number;
    groupBy?: "day" | "week" | "month";
  }
) {
  const { targetVenueIds, currency } = await getOwnerTargetVenues(
    ownerId,
    userRole,
    options?.venueId
  );
  const { current } = resolveDateRange(options?.preset, options?.startDate, options?.endDate);
  const groupBy = options?.groupBy || "day";

  if (targetVenueIds.length === 0) {
    return {
      currency,
      summary: { totalRevenue: 0, bookingValue: 0, outstanding: 0, refunds: 0 },
      timeline: [],
      byCourt: [],
      byPaymentMethod: [],
    };
  }

  const bookings = await prisma.booking.findMany({
    where: {
      court: { venueId: { in: targetVenueIds } },
      bookingDate: { gte: current.startDate, lte: current.endDate },
    },
    include: {
      payments: true,
      court: { select: { id: true, name: true, venue: { select: { id: true, name: true } } } },
    },
    orderBy: { bookingDate: "asc" },
  });

  // Timeline aggregation map
  const timelineMap = new Map<
    string,
    { label: string; collectedRevenue: number; bookingValue: number; bookingsCount: number }
  >();

  // Court aggregation map
  const courtMap = new Map<
    number,
    { courtName: string; venueId: number; venueName: string; collectedRevenue: number; bookingValue: number; bookingsCount: number }
  >();

  // Payment method map
  const methodMap = new Map<string, { amount: number; count: number }>();

  let totalCollected = 0;
  let totalBookingVal = 0;
  let totalRefunds = 0;

  for (const b of bookings) {
    for (const p of b.payments) {
      if (p.status === PaymentStatus.REFUNDED) {
        totalRefunds += p.amount;
      }
    }

    if (b.status === BookingStatus.CANCELLED) {
      continue;
    }

    totalBookingVal += b.totalPrice;

    // Paid amount for this booking
    let bookingPaid = 0;
    for (const p of b.payments) {
      if (p.status === PaymentStatus.PAID) {
        bookingPaid += p.amount;
        totalCollected += p.amount;

        const methodKey = p.paymentMethod || "VIETQR";
        const m = methodMap.get(methodKey) || { amount: 0, count: 0 };
        m.amount += p.amount;
        m.count += 1;
        methodMap.set(methodKey, m);
      }
    }

    // Timeline grouping key
    const bDate = new Date(b.bookingDate);
    let groupKey = bDate.toISOString().slice(0, 10);
    let label = groupKey;

    if (groupBy === "month") {
      groupKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, "0")}`;
      label = groupKey;
    } else if (groupBy === "week") {
      // Calculate start of week (Monday)
      const d = new Date(bDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      groupKey = weekStart.toISOString().slice(0, 10);
      label = `Wk ${groupKey}`;
    }

    const tEntry = timelineMap.get(groupKey) || {
      label,
      collectedRevenue: 0,
      bookingValue: 0,
      bookingsCount: 0,
    };
    tEntry.collectedRevenue += bookingPaid;
    tEntry.bookingValue += b.totalPrice;
    tEntry.bookingsCount += 1;
    timelineMap.set(groupKey, tEntry);

    // Court grouping
    const cEntry = courtMap.get(b.courtId) || {
      courtName: b.court.name,
      venueId: b.court.venue.id,
      venueName: b.court.venue.name,
      collectedRevenue: 0,
      bookingValue: 0,
      bookingsCount: 0,
    };
    cEntry.collectedRevenue += bookingPaid;
    cEntry.bookingValue += b.totalPrice;
    cEntry.bookingsCount += 1;
    courtMap.set(b.courtId, cEntry);
  }

  // Format Timeline
  const timeline: RevenueTrendItem[] = Array.from(timelineMap.entries())
    .map(([date, data]) => ({
      date,
      label: data.label,
      collectedRevenue: data.collectedRevenue,
      bookingValue: data.bookingValue,
      outstandingBalance: Math.max(0, data.bookingValue - data.collectedRevenue),
      bookingsCount: data.bookingsCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Format By Court
  const byCourt: RevenueByCourtItem[] = Array.from(courtMap.entries()).map(([courtId, data]) => ({
    courtId,
    courtName: data.courtName,
    venueId: data.venueId,
    venueName: data.venueName,
    collectedRevenue: data.collectedRevenue,
    bookingValue: data.bookingValue,
    bookingsCount: data.bookingsCount,
    utilizationRate: 0, // Will be enriched when combined with court schedules
  }));

  // Format Payment Methods
  const byPaymentMethod: RevenueByPaymentMethodItem[] = Array.from(methodMap.entries()).map(
    ([method, data]) => ({
      method,
      amount: data.amount,
      transactionCount: data.count,
      percentage: totalCollected > 0 ? Math.round((data.amount / totalCollected) * 1000) / 10 : 0,
    })
  );

  return {
    currency,
    summary: {
      totalRevenue: totalCollected,
      bookingValue: totalBookingVal,
      outstanding: Math.max(0, totalBookingVal - totalCollected),
      refunds: totalRefunds,
    },
    paidVsOutstanding: {
      collectedRevenue: totalCollected,
      outstandingBalance: Math.max(0, totalBookingVal - totalCollected),
      paidPercentage: totalBookingVal > 0 ? (totalCollected / totalBookingVal) * 100 : 0,
      outstandingPercentage:
        totalBookingVal > 0
          ? (Math.max(0, totalBookingVal - totalCollected) / totalBookingVal) * 100
          : 0,
    },
    timeline,
    byCourt,
    breakdownByCourt: byCourt,
    byPaymentMethod,
    breakdownByPaymentMethod: byPaymentMethod,
    growthRate: 0,
  };
}

/**
 * Computes court-by-court performance metrics and utilization rates.
 */
export async function getOwnerCourtUtilization(
  ownerId: number,
  userRole: UserRole,
  options?: {
    preset?: DateFilterPreset;
    startDate?: string;
    endDate?: string;
    venueId?: number;
    courtId?: number;
  }
): Promise<{
  currency: string;
  courts: CourtUtilizationItem[];
  overallUtilization: number;
  summary: {
    totalCourts: number;
    totalBookedHours: number;
    totalAvailableHours: number;
    totalMaintenanceHours: number;
    overallUtilizationRate: number;
    totalRevenue: number;
  };
}> {
  const { targetVenueIds, currency } = await getOwnerTargetVenues(
    ownerId,
    userRole,
    options?.venueId
  );
  const { current } = resolveDateRange(options?.preset, options?.startDate, options?.endDate);

  if (targetVenueIds.length === 0) {
    return {
      currency,
      courts: [],
      overallUtilization: 0,
      summary: {
        totalCourts: 0,
        totalBookedHours: 0,
        totalAvailableHours: 0,
        totalMaintenanceHours: 0,
        overallUtilizationRate: 0,
        totalRevenue: 0,
      },
    };
  }

  const dayCount = Math.max(
    1,
    Math.ceil((current.endDate.getTime() - current.startDate.getTime()) / (1000 * 3600 * 24))
  );

  const courtWhere: any = { venueId: { in: targetVenueIds }, isActive: true };
  if (options?.courtId) {
    courtWhere.id = options.courtId;
  }

  // Fetch all active courts in target venues
  const courts = await prisma.court.findMany({
    where: courtWhere,
    include: {
      venue: { select: { id: true, name: true, openTime: true, closeTime: true } },
      maintenanceBlocks: {
        where: { date: { gte: current.startDate, lte: current.endDate } },
      },
      bookings: {
        where: { bookingDate: { gte: current.startDate, lte: current.endDate } },
        include: { payments: true },
      },
    },
    orderBy: [{ venueId: "asc" }, { id: "asc" }],
  });

  let aggregateBookedHours = 0;
  let aggregateAvailableHours = 0;

  const courtItems: CourtUtilizationItem[] = courts.map((court) => {
    const openH = parseHourStringToFloat(court.venue.openTime || "06:00");
    const closeH = parseHourStringToFloat(court.venue.closeTime || "23:00");
    const dailyOperatingHours = Math.max(0, closeH - openH);

    // Maintenance hours
    let maintenanceHours = 0;
    for (const mb of court.maintenanceBlocks) {
      const sH = parseHourStringToFloat(mb.startTime);
      const eH = parseHourStringToFloat(mb.endTime);
      maintenanceHours += Math.max(0, eH - sH);
    }

    const availableHours = Math.max(0, dailyOperatingHours * dayCount - maintenanceHours);

    // Bookings breakdown
    const totalBookings = court.bookings.length;
    const confirmedList = court.bookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED
    );
    const confirmedBookings = confirmedList.length;
    const cancelledBookings = court.bookings.filter((b) => b.status === BookingStatus.CANCELLED).length;
    const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 1000) / 10 : 0;

    let bookedHours = 0;
    let revenueCollected = 0;

    for (const b of confirmedList) {
      bookedHours += b.duration || 1;
      for (const p of b.payments) {
        if (p.status === PaymentStatus.PAID) {
          revenueCollected += p.amount;
        }
      }
    }

    const utilizationRate =
      availableHours > 0
        ? Math.min(100, Math.round((bookedHours / availableHours) * 1000) / 10)
        : 0;

    aggregateBookedHours += bookedHours;
    aggregateAvailableHours += availableHours;

    const averageBookingValue =
      confirmedBookings > 0 ? Math.round(revenueCollected / confirmedBookings) : 0;

    return {
      courtId: court.id,
      courtName: court.name,
      venueId: court.venue.id,
      venueName: court.venue.name,
      pricePerHour: court.priceHour,
      bookedHours,
      availableHours,
      maintenanceHours,
      utilizationRate,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      cancellationRate,
      revenueCollected,
      averageBookingValue,
    };
  });

  const overallUtilization =
    aggregateAvailableHours > 0
      ? Math.min(100, Math.round((aggregateBookedHours / aggregateAvailableHours) * 1000) / 10)
      : 0;

  return {
    currency,
    courts: courtItems,
    overallUtilization,
    summary: {
      totalCourts: courtItems.length,
      totalBookedHours: aggregateBookedHours,
      totalAvailableHours: aggregateAvailableHours,
      totalMaintenanceHours: courtItems.reduce((sum, c) => sum + c.maintenanceHours, 0),
      overallUtilizationRate: overallUtilization,
      totalRevenue: courtItems.reduce((sum, c) => sum + c.revenueCollected, 0),
    },
  };
}

/**
 * Analyzes peak booking hours, popular time slots, weekday distribution, and booking lead times.
 */
export async function getOwnerPeakHoursAnalysis(
  ownerId: number,
  userRole: UserRole,
  options?: {
    preset?: DateFilterPreset;
    startDate?: string;
    endDate?: string;
    venueId?: number;
    courtId?: number;
  }
): Promise<PeakHoursAnalysis> {
  const { targetVenueIds } = await getOwnerTargetVenues(ownerId, userRole, options?.venueId);
  const { current } = resolveDateRange(options?.preset, options?.startDate, options?.endDate);

  if (targetVenueIds.length === 0) {
    return {
      weekdayBreakdown: [],
      hourlyBreakdown: [],
      popularTimeSlots: [],
      leastUtilizedTimeSlots: [],
      averageLeadTimeHours: 0,
      averageLeadTimeDays: 0,
    };
  }

  const bookingWhere: any = {
    court: { venueId: { in: targetVenueIds } },
    bookingDate: { gte: current.startDate, lte: current.endDate },
    status: { not: BookingStatus.CANCELLED },
  };
  if (options?.courtId) {
    bookingWhere.courtId = options.courtId;
  }

  // Fetch valid confirmed bookings
  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    select: {
      bookingDate: true,
      startTime: true,
      endTime: true,
      duration: true,
      createdAt: true,
    },
  });

  // Weekdays: 0 (Sun) to 6 (Sat)
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayMap = new Map<number, { bookedHours: number; count: number }>();
  for (let i = 0; i < 7; i++) {
    weekdayMap.set(i, { bookedHours: 0, count: 0 });
  }

  // Hourly counts from 06:00 to 22:00
  const hourMap = new Map<string, number>();
  for (let h = 6; h <= 22; h++) {
    const key = `${String(h).padStart(2, "0")}:00`;
    hourMap.set(key, 0);
  }

  let totalLeadTimeHours = 0;
  let leadTimeCount = 0;

  for (const b of bookings) {
    const bDate = new Date(b.bookingDate);
    const dayOfWeek = bDate.getDay();

    const wData = weekdayMap.get(dayOfWeek)!;
    wData.bookedHours += b.duration || 1;
    wData.count += 1;

    // Hour of day
    const startHourInt = Math.floor(parseHourStringToFloat(b.startTime));
    const duration = b.duration || 1;

    for (let i = 0; i < duration; i++) {
      const slotH = startHourInt + i;
      if (slotH >= 6 && slotH <= 22) {
        const slotKey = `${String(slotH).padStart(2, "0")}:00`;
        hourMap.set(slotKey, (hourMap.get(slotKey) || 0) + 1);
      }
    }

    // Lead time calculation
    const [h, m] = b.startTime.split(":").map(Number);
    const matchTime = new Date(bDate);
    matchTime.setHours(h || 0, m || 0, 0, 0);
    const leadMs = matchTime.getTime() - b.createdAt.getTime();
    if (leadMs >= 0) {
      totalLeadTimeHours += leadMs / (1000 * 3600);
      leadTimeCount++;
    }
  }

  const totalBookingsCount = bookings.length;

  // Format Weekday breakdown
  const weekdayBreakdown = Array.from(weekdayMap.entries()).map(([dayOfWeek, data]) => ({
    dayOfWeek,
    dayName: weekdayNames[dayOfWeek],
    bookedHours: data.bookedHours,
    bookingsCount: data.count,
    utilizationPercent:
      totalBookingsCount > 0 ? Math.round((data.count / totalBookingsCount) * 1000) / 10 : 0,
  }));

  // Format Hourly breakdown
  const totalSlotOccurrences = Array.from(hourMap.values()).reduce((sum, v) => sum + v, 0);
  const hourlyBreakdown = Array.from(hourMap.entries()).map(([hour, count]) => ({
    hour,
    bookingCount: count,
    percentage:
      totalSlotOccurrences > 0 ? Math.round((count / totalSlotOccurrences) * 1000) / 10 : 0,
  }));

  // Popular and least utilized slots
  const sortedHourly = [...hourlyBreakdown].sort((a, b) => b.bookingCount - a.bookingCount);
  const popularTimeSlots = sortedHourly.slice(0, 3).map((h) => ({
    hour: h.hour,
    bookingCount: h.bookingCount,
    label: `${h.hour} - Peak demand (${h.bookingCount} bookings)`,
  }));

  const leastUtilizedTimeSlots = [...sortedHourly]
    .reverse()
    .slice(0, 3)
    .map((h) => ({
      hour: h.hour,
      bookingCount: h.bookingCount,
      label: `${h.hour} - Low utilization (${h.bookingCount} bookings)`,
    }));

  const avgLeadH = leadTimeCount > 0 ? Math.round((totalLeadTimeHours / leadTimeCount) * 10) / 10 : 0;
  const avgLeadDays = Math.round((avgLeadH / 24) * 10) / 10;

  return {
    weekdayBreakdown,
    hourlyBreakdown,
    popularTimeSlots,
    leastUtilizedTimeSlots,
    averageLeadTimeHours: avgLeadH,
    averageLeadTimeDays: avgLeadDays,
  };
}

/**
 * Escapes CSV cell to prevent spreadsheet formula injection and syntax breaking.
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);

  // Security: neutralizes spreadsheet formula injection (=, +, -, @, \t, \r)
  const firstChar = str.charAt(0);
  if (["=", "+", "-", "@", "\t", "\r"].includes(firstChar)) {
    str = `'${str}`;
  }

  // If cell contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates CSV string for filtered owner bookings.
 */
export async function generateOwnerBookingsCsv(
  ownerId: number,
  userRole: UserRole,
  options?: {
    preset?: DateFilterPreset;
    startDate?: string;
    endDate?: string;
    venueId?: number;
    courtId?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
  }
): Promise<string> {
  const { targetVenueIds } = await getOwnerTargetVenues(ownerId, userRole, options?.venueId);
  const { current } = resolveDateRange(options?.preset, options?.startDate, options?.endDate);

  if (targetVenueIds.length === 0) {
    return "Booking Code,Customer Name,Customer Phone,Customer Email,Venue,Court,Date,Start Time,End Time,Duration (Hours),Price Per Hour,Total Price,Paid Amount,Booking Status,Payment Status,Payment Method,Created At,Cancellation Reason\n";
  }

  const whereClause: any = {
    court: { venueId: { in: targetVenueIds } },
    bookingDate: { gte: current.startDate, lte: current.endDate },
  };

  if (options?.courtId) {
    whereClause.courtId = Number(options.courtId);
  }
  if (options?.status && options.status !== "ALL") {
    whereClause.status = options.status;
  }
  if (options?.paymentStatus && options.paymentStatus !== "ALL") {
    whereClause.paymentStatus = options.paymentStatus;
  }
  if (options?.search) {
    const q = options.search.trim();
    whereClause.OR = [
      { bookingCode: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    include: {
      court: { include: { venue: true } },
      payments: true,
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
    orderBy: { bookingDate: "desc" },
  });

  const headers = [
    "Booking Code",
    "Customer Name",
    "Customer Phone",
    "Customer Email",
    "Venue",
    "Court",
    "Date",
    "Start Time",
    "End Time",
    "Duration (Hours)",
    "Total Price (VND)",
    "Collected Paid (VND)",
    "Booking Status",
    "Payment Status",
    "Payment Method",
    "Created At",
    "Cancellation Reason",
  ];

  const rows = bookings.map((b) => {
    const customerName = b.customerName || b.user?.name || "Customer";
    const customerPhone = b.customerPhone || b.user?.phone || "";
    const customerEmail = b.customerEmail || b.user?.email || "";
    const collectedAmount = b.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amount, 0);

    return [
      escapeCsvCell(b.bookingCode || `#${b.id}`),
      escapeCsvCell(customerName),
      escapeCsvCell(customerPhone),
      escapeCsvCell(customerEmail),
      escapeCsvCell(b.court.venue.name),
      escapeCsvCell(b.court.name),
      escapeCsvCell(b.bookingDate.toISOString().slice(0, 10)),
      escapeCsvCell(b.startTime),
      escapeCsvCell(b.endTime || ""),
      escapeCsvCell(b.duration),
      escapeCsvCell(b.totalPrice),
      escapeCsvCell(collectedAmount),
      escapeCsvCell(b.status),
      escapeCsvCell(b.paymentStatus),
      escapeCsvCell(b.paymentMethod || "VIETQR"),
      escapeCsvCell(b.createdAt.toISOString()),
      escapeCsvCell(b.cancellationReason || ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generates CSV string for revenue summaries.
 */
export async function generateOwnerRevenueCsv(
  ownerId: number,
  userRole: UserRole,
  options?: {
    preset?: DateFilterPreset;
    startDate?: string;
    endDate?: string;
    venueId?: number;
    groupBy?: "day" | "week" | "month";
  }
): Promise<string> {
  const analytics = await getOwnerRevenueAnalytics(ownerId, userRole, options);

  const headers = [
    "Period Date",
    "Period Label",
    "Collected Paid Revenue (VND)",
    "Total Booking Value (VND)",
    "Outstanding Balance (VND)",
    "Bookings Count",
  ];

  const rows = analytics.timeline.map((item) =>
    [
      escapeCsvCell(item.date),
      escapeCsvCell(item.label),
      escapeCsvCell(item.collectedRevenue),
      escapeCsvCell(item.bookingValue),
      escapeCsvCell(item.outstandingBalance),
      escapeCsvCell(item.bookingsCount),
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
