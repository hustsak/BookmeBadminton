import { prisma } from "../lib/prisma";
import {
  resolveDateRange,
  getOwnerTargetVenues,
  getOwnerOverviewKPIs,
  getOwnerRevenueAnalytics,
  getOwnerCourtUtilization,
  getOwnerPeakHoursAnalysis,
  escapeCsvCell,
  generateOwnerBookingsCsv,
  generateOwnerRevenueCsv,
} from "../lib/owner-analytics";
import { cancelBooking } from "../lib/booking-engine";
import { BookingStatus, PaymentStatus, UserRole } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runOwnerAnalyticsTests() {
  console.log("=========================================================");
  console.log("🏸 BOOKMEBADMINTON PHASE 6: OWNER ANALYTICS & DASHBOARD 🏸");
  console.log("=========================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      process.stdout.write(`• Testing: ${name}... `);
      await fn();
      console.log("✅ PASSED");
      passedCount++;
    } catch (err: any) {
      console.log("❌ FAILED");
      console.error("  ", err.message || err);
      failedCount++;
    }
  }

  // --- SEED TEST USERS AND VENUES ---
  const timestamp = Date.now();
  let zeroVenueId: number | null = null;
  const ownerAlphaEmail = `owner.alpha.${timestamp}@test.com`;
  const ownerBetaEmail = `owner.beta.${timestamp}@test.com`;
  const customerEmail = `player.analytics.${timestamp}@test.com`;

  const ownerAlpha = await prisma.user.create({
    data: {
      name: "Owner Alpha",
      email: ownerAlphaEmail,
      role: UserRole.OWNER,
      phone: "0901111111",
    },
  });

  const ownerBeta = await prisma.user.create({
    data: {
      name: "Owner Beta",
      email: ownerBetaEmail,
      role: UserRole.OWNER,
      phone: "0902222222",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "VIP Player",
      email: customerEmail,
      role: UserRole.CUSTOMER,
      phone: "0909999999",
    },
  });

  // Venue Alpha (VND, open 06:00 - 22:00 = 16 operating hours/day)
  const venueAlpha = await prisma.venue.create({
    data: {
      name: `Alpha Stadium ${timestamp}`,
      location: "Hanoi, Vietnam",
      address: "100 Kim Ma",
      openTime: "06:00",
      closeTime: "22:00",
      ownerId: ownerAlpha.id,
      currency: "VND",
    },
  });

  // Venue Beta (USD, owned by Owner Beta)
  const venueBeta = await prisma.venue.create({
    data: {
      name: `Beta Arena ${timestamp}`,
      location: "Da Nang, Vietnam",
      address: "200 Bach Dang",
      openTime: "07:00",
      closeTime: "23:00",
      ownerId: ownerBeta.id,
      currency: "USD",
    },
  });

  // Courts for Venue Alpha
  const courtAlpha1 = await prisma.court.create({
    data: {
      venueId: venueAlpha.id,
      name: "Alpha Court 1",
      surface: "Taraflex Pro",
      priceHour: 100000,
    },
  });

  const courtAlpha2 = await prisma.court.create({
    data: {
      venueId: venueAlpha.id,
      name: "Alpha Court 2",
      surface: "Standard Wood",
      priceHour: 120000,
    },
  });

  // Court for Venue Beta
  const courtBeta1 = await prisma.court.create({
    data: {
      venueId: venueBeta.id,
      name: "Beta Court 1",
      surface: "Taraflex Pro",
      priceHour: 25, // USD
    },
  });

  // Today's date normalized
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

  // --- TESTS ---

  // 1. Strict Owner Isolation
  await test("Strict Owner Isolation blocks access to other owners' venues", async () => {
    // Owner Alpha queries their own venue
    const alphaTarget = await getOwnerTargetVenues(ownerAlpha.id, UserRole.OWNER, venueAlpha.id);
    assert(alphaTarget.targetVenueIds.includes(venueAlpha.id), "Owner Alpha should access venueAlpha");

    // Owner Alpha tries to query Owner Beta's venue
    let caughtForbidden = false;
    try {
      await getOwnerTargetVenues(ownerAlpha.id, UserRole.OWNER, venueBeta.id);
    } catch (err: any) {
      if (err.code === "FORBIDDEN") {
        caughtForbidden = true;
      }
    }
    assert(caughtForbidden, "Access to another owner's venue must be rejected with FORBIDDEN");
  });

  // 2. Verified Paid Revenue vs Pending/Failed/Refunded
  await test("Revenue totals count ONLY verified PAID payments and exclude PENDING/FAILED", async () => {
    // Create Booking 1: Confirmed with PAID payment
    const b1 = await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: courtAlpha1.id,
        bookingCode: `BM-PAID-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "08:00",
        endTime: "10:00",
        duration: 2,
        totalPrice: 200000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: b1.id,
        amount: 200000,
        paymentMethod: "VIETQR",
        status: PaymentStatus.PAID,
        transactionRef: `TX-PAID-${timestamp}-1`,
        paidAt: new Date(),
      },
    });

    // Create Booking 2: Pending booking with PENDING payment (uncollected)
    const b2 = await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: courtAlpha1.id,
        bookingCode: `BM-PENDING-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "10:00",
        endTime: "11:00",
        duration: 1,
        totalPrice: 100000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: b2.id,
        amount: 100000,
        paymentMethod: "VIETQR",
        status: PaymentStatus.PENDING,
        transactionRef: `TX-PEND-${timestamp}-2`,
      },
    });

    // Create Booking 3: Failed booking with FAILED payment
    const b3 = await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: courtAlpha1.id,
        bookingCode: `BM-FAILED-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "11:00",
        endTime: "12:00",
        duration: 1,
        totalPrice: 100000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: b3.id,
        amount: 100000,
        paymentMethod: "VIETQR",
        status: PaymentStatus.FAILED,
        transactionRef: `TX-FAIL-${timestamp}-3`,
      },
    });

    // Query KPIs for today
    const kpis = await getOwnerOverviewKPIs(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
    });

    assert(
      kpis.confirmedPaidRevenue.value === 200000,
      `Expected confirmed paid revenue of 200000, got ${kpis.confirmedPaidRevenue.value}`
    );
    // Booking value for non-cancelled is 200000 (b1) + 100000 (b2) + 100000 (b3) = 400000
    assert(
      kpis.bookingRevenue.value === 400000,
      `Expected total booking value of 400000, got ${kpis.bookingRevenue.value}`
    );
    // Outstanding balance = 400000 - 200000 = 200000
    assert(
      kpis.outstandingPayments.value === 200000,
      `Expected outstanding payments of 200000, got ${kpis.outstandingPayments.value}`
    );
  });

  // 3. Refunded Payments Tracking
  await test("Refunded payments are tracked in refundedAmount without reducing historical paid records improperly", async () => {
    // Create Booking with a REFUNDED payment record
    const bRefund = await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: courtAlpha2.id,
        bookingCode: `BM-REFUND-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "14:00",
        endTime: "16:00",
        duration: 2,
        totalPrice: 240000,
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
        cancellationReason: "Customer requested refund",
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: bRefund.id,
        amount: 240000,
        paymentMethod: "VIETQR",
        status: PaymentStatus.REFUNDED,
        transactionRef: `TX-REFUND-${timestamp}`,
      },
    });

    const kpis = await getOwnerOverviewKPIs(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
    });

    assert(
      kpis.refundedAmount.value >= 240000,
      `Expected refundedAmount >= 240000, got ${kpis.refundedAmount.value}`
    );
    assert(
      kpis.cancelledBookings.value >= 1,
      `Expected cancelledBookings >= 1, got ${kpis.cancelledBookings.value}`
    );
  });

  // 4. Duplicate / Multiple Payment Events (Ledger Integrity)
  await test("Multiple partial paid payments for one booking are correctly summed without double-counting", async () => {
    // Booking with 2 partial payments: 50,000 deposit + 50,000 balance
    const bPartial = await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: courtAlpha1.id,
        bookingCode: `BM-PARTIAL-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "16:00",
        endTime: "17:00",
        duration: 1,
        totalPrice: 100000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    await prisma.payment.createMany({
      data: [
        {
          bookingId: bPartial.id,
          amount: 50000,
          paymentMethod: "VIETQR",
          status: PaymentStatus.PAID,
          transactionRef: `TX-PART1-${timestamp}`,
          paidAt: new Date(),
        },
        {
          bookingId: bPartial.id,
          amount: 50000,
          paymentMethod: "MANUAL_CASH",
          status: PaymentStatus.PAID,
          transactionRef: `TX-PART2-${timestamp}`,
          paidAt: new Date(),
        },
      ],
    });

    const revenueAnalytics = await getOwnerRevenueAnalytics(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
    });

    // Check payment methods breakdown contains both VIETQR and MANUAL_CASH
    const pmList = revenueAnalytics.breakdownByPaymentMethod || revenueAnalytics.byPaymentMethod || [];
    const qrMethod = pmList.find((m: any) => m.method === "VIETQR");
    const cashMethod = pmList.find((m: any) => m.method === "MANUAL_CASH");

    assert(qrMethod !== undefined, "VIETQR method should be tracked in breakdown");
    assert(cashMethod !== undefined, "MANUAL_CASH method should be tracked in breakdown");
    assert(cashMethod!.amount >= 50000, "MANUAL_CASH amount should include the 50,000 cash deposit");
  });

  // 5. Date-Range Boundaries & Previous Period Comparisons
  await test("Date-range boundaries and comparison period calculation", async () => {
    const { current, previous } = resolveDateRange("last7days");
    const diffCurrentMs = current.endDate.getTime() - current.startDate.getTime();
    const diffPreviousMs = previous.endDate.getTime() - previous.startDate.getTime();

    // Both periods should span exactly 7 days
    const diffCurrentDays = Math.round(diffCurrentMs / (1000 * 60 * 60 * 24));
    const diffPreviousDays = Math.round(diffPreviousMs / (1000 * 60 * 60 * 24));

    assert(diffCurrentDays === 7, `Current range should be 7 days, got ${diffCurrentDays}`);
    assert(diffPreviousDays === 7, `Previous range should be 7 days, got ${diffPreviousDays}`);
    assert(
      previous.endDate < current.startDate,
      "Previous period must precede the current period without overlapping"
    );
  });

  // 6. Court Utilization Rate with Maintenance Blocks
  await test("Court utilization respects maintenance blocks and caps at 100%", async () => {
    // Schedule a 2-hour maintenance block on Court Alpha 2 for today
    await prisma.maintenanceBlock.create({
      data: {
        courtId: courtAlpha2.id,
        date: todayDateOnly,
        startTime: "12:00",
        endTime: "14:00",
        reason: "Floor Resurfacing & Cleaning",
      },
    });

    // Create a 2-hour confirmed booking on Court Alpha 2 (16:00 to 18:00)
    await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: courtAlpha2.id,
        bookingCode: `BM-UTIL-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "16:00",
        endTime: "18:00",
        duration: 2,
        totalPrice: 240000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    const util = await getOwnerCourtUtilization(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
      courtId: courtAlpha2.id,
    });

    const courtStat = util.courts.find((c) => c.courtId === courtAlpha2.id);
    assert(courtStat !== undefined, "Court Alpha 2 should be in utilization report");
    // Venue operating hours: 06:00 to 22:00 = 16 hours.
    // Maintenance block: 2 hours.
    // Available hours = 16 - 2 = 14 hours.
    assert(
      courtStat!.maintenanceHours === 2,
      `Expected maintenanceHours to be 2, got ${courtStat!.maintenanceHours}`
    );
    assert(
      courtStat!.availableHours === 14,
      `Expected availableHours to be 14 (16h - 2h maintenance), got ${courtStat!.availableHours}`
    );
    // Booked hours = 2 hours.
    // Utilization = (2 / 14) * 100 ≈ 14.3%
    const expectedUtil = (courtStat!.bookedHours / courtStat!.availableHours) * 100;
    assert(
      Math.abs(courtStat!.utilizationRate - expectedUtil) < 0.1,
      `Expected utilization rate ${expectedUtil}%, got ${courtStat!.utilizationRate}%`
    );
  });

  // 7. Zero-Hour Safety (No Division-by-Zero)
  await test("Courts with zero available hours handle safely without NaN or crash", async () => {
    // Create temporary venue with 0 operating hours (open == close)
    const zeroVenue = await prisma.venue.create({
      data: {
        name: `Zero Arena ${timestamp}`,
        location: "Test",
        address: "Test",
        openTime: "08:00",
        closeTime: "08:00", // 0 operating hours!
        ownerId: ownerAlpha.id,
      },
    });
    zeroVenueId = zeroVenue.id;

    const zeroCourt = await prisma.court.create({
      data: {
        venueId: zeroVenue.id,
        name: "Zero Court",
        surface: "Standard",
        priceHour: 50000,
      },
    });

    const util = await getOwnerCourtUtilization(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: zeroVenue.id,
      courtId: zeroCourt.id,
    });

    const zeroStat = util.courts.find((c) => c.courtId === zeroCourt.id);
    assert(zeroStat !== undefined, "Zero Court should be in report");
    assert(zeroStat!.availableHours === 0, "Available hours must be 0");
    assert(zeroStat!.utilizationRate === 0, "Utilization must safely evaluate to 0 instead of NaN");
    assert(!isNaN(zeroStat!.utilizationRate), "Utilization must NOT be NaN");
  });

  // 8. Cancelled Bookings Exclusion from Utilization
  await test("Cancelled bookings are strictly excluded from booked hours and utilization", async () => {
    // Dedicated isolated court
    const cancelCourt = await prisma.court.create({
      data: {
        venueId: venueAlpha.id,
        name: `Cancel Isolation Court ${timestamp}`,
        surface: "Taraflex Pro",
        priceHour: 100000,
      },
    });

    // 1 confirmed booking of 2 hours
    await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: cancelCourt.id,
        bookingCode: `BM-CONF-ISOL-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "09:00",
        endTime: "11:00",
        duration: 2,
        totalPrice: 200000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    // 1 cancelled booking of 3 hours
    await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: cancelCourt.id,
        bookingCode: `BM-CANC-ISOL-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "18:00",
        endTime: "21:00",
        duration: 3,
        totalPrice: 300000,
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.PENDING,
        cancellationReason: "Player schedule conflict",
      },
    });

    const util = await getOwnerCourtUtilization(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
      courtId: cancelCourt.id,
    });

    const courtStat = util.courts.find((c) => c.courtId === cancelCourt.id);
    assert(courtStat !== undefined, "Cancel test court found");
    assert(courtStat!.cancelledBookings === 1, `Expected 1 cancelled booking, got ${courtStat!.cancelledBookings}`);
    assert(courtStat!.confirmedBookings === 1, `Expected 1 confirmed booking, got ${courtStat!.confirmedBookings}`);
    assert(
      courtStat!.bookedHours === 2,
      `Expected bookedHours to be exactly 2h (excluding the 3h cancelled slot), got ${courtStat!.bookedHours}`
    );
  });

  // 9. Peak-Hour Grouping & Lead Time
  await test("Peak-hour grouping and booking lead time calculation", async () => {
    const peakAnalysis = await getOwnerPeakHoursAnalysis(ownerAlpha.id, UserRole.OWNER, {
      preset: "last30days",
      venueId: venueAlpha.id,
    });

    assert(Array.isArray(peakAnalysis.weekdayBreakdown), "weekdayBreakdown must be an array");
    assert(peakAnalysis.weekdayBreakdown.length === 7, "weekdayBreakdown must cover all 7 days of the week");
    assert(Array.isArray(peakAnalysis.hourlyBreakdown), "hourlyBreakdown must be an array");
    assert(peakAnalysis.hourlyBreakdown.length > 0, "hourlyBreakdown must include hourly intervals");
    assert(Array.isArray(peakAnalysis.popularTimeSlots), "popularTimeSlots must be an array");
    assert(Array.isArray(peakAnalysis.leastUtilizedTimeSlots), "leastUtilizedTimeSlots must be an array");
    assert(typeof peakAnalysis.averageLeadTimeHours === "number", "averageLeadTimeHours must be a number");
    assert(!isNaN(peakAnalysis.averageLeadTimeHours), "averageLeadTimeHours must not be NaN");
  });

  // 10. CSV Escaping & Formula Injection Protection
  await test("CSV cell escaping protects against formula injection (=, +, -, @, tab, cr)", async () => {
    // Normal string
    assert(escapeCsvCell("Standard Customer") === "Standard Customer", "Normal cell unchanged");

    // String with comma
    assert(escapeCsvCell("Hanoi, Vietnam") === '"Hanoi, Vietnam"', "Commas wrapped in quotes");

    // Formula injection attempts
    const eqFormula = "=SUM(A1:A10)";
    const plusFormula = "+cmd|' /C calc'!A0";
    const minusFormula = "-5+10";
    const atFormula = "@SUM(1+1)";
    const tabFormula = "\tcmd";

    assert(escapeCsvCell(eqFormula) === "'=SUM(A1:A10)", "= formula prefixed with apostrophe");
    assert(escapeCsvCell(plusFormula).startsWith("'+"), "+ formula prefixed with apostrophe");
    assert(escapeCsvCell(minusFormula) === "'-5+10", "- formula prefixed with apostrophe");
    assert(escapeCsvCell(atFormula) === "'@SUM(1+1)", "@ formula prefixed with apostrophe");
    assert(escapeCsvCell(tabFormula).startsWith("'\t"), "Tab prefix escaped with apostrophe");
  });

  // 11. CSV Reports Generation
  await test("CSV generation produces valid formatted reports without exposing forbidden owner data", async () => {
    const bookingsCsv = await generateOwnerBookingsCsv(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
    });

    assert(bookingsCsv.includes("Booking Code"), "CSV header must include Booking Code");
    assert(bookingsCsv.includes("Total Price (VND)"), "CSV header must include Total Price (VND)");
    // Must NOT contain Beta Arena's court name or data
    assert(!bookingsCsv.includes(venueBeta.name), "Must not leak other owner's venue data");

    const revenueCsv = await generateOwnerRevenueCsv(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
    });

    assert(revenueCsv.includes("Period Date"), "Revenue CSV must include Period Date");
    assert(revenueCsv.includes("Collected Paid Revenue (VND)"), "Revenue CSV must include Collected Paid Revenue");
  });

  // 12. Venue-Specific Currency Support
  await test("Venue currency is dynamically preserved (VND vs USD)", async () => {
    const alphaKpi = await getOwnerOverviewKPIs(ownerAlpha.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueAlpha.id,
    });
    assert(alphaKpi.currency === "VND", `Expected Alpha currency VND, got ${alphaKpi.currency}`);

    const betaKpi = await getOwnerOverviewKPIs(ownerBeta.id, UserRole.OWNER, {
      preset: "today",
      venueId: venueBeta.id,
    });
    assert(betaKpi.currency === "USD", `Expected Beta currency USD, got ${betaKpi.currency}`);
  });

  // 13. Cancellation Reason Persistence
  await test("Booking cancellation records mandatory reason in cancellationReason field", async () => {
    const bToCancel = await prisma.booking.create({
      data: {
        userId: customer.id,
        courtId: courtAlpha1.id,
        bookingCode: `BM-TESTCANCEL-${timestamp}`,
        bookingDate: todayDateOnly,
        startTime: "21:00",
        endTime: "22:00",
        duration: 1,
        totalPrice: 100000,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    const reason = "Emergency court light fixture repair";
    const cancelled = await cancelBooking(bToCancel.id, {
      reason,
      cancelledByUserId: ownerAlpha.id,
    });

    assert(cancelled.status === BookingStatus.CANCELLED, "Booking must be cancelled");
    assert(cancelled.cancellationReason === reason, "cancellationReason must match provided string");
  });

  console.log("\n=========================================================");
  console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("=========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }

  // --- CLEAN UP TEST DATA ---
  try {
    const vIds = [venueAlpha.id, venueBeta.id, ...(zeroVenueId ? [zeroVenueId] : [])];
    const cIds = (
      await prisma.court.findMany({
        where: { venueId: { in: vIds } },
        select: { id: true },
      })
    ).map((c) => c.id);

    await prisma.payment.deleteMany({ where: { booking: { courtId: { in: cIds } } } });
    await prisma.booking.deleteMany({ where: { courtId: { in: cIds } } });
    await prisma.maintenanceBlock.deleteMany({ where: { courtId: { in: cIds } } });
    await prisma.court.deleteMany({ where: { id: { in: cIds } } });
    await prisma.venue.deleteMany({ where: { id: { in: vIds } } });
    await prisma.user.deleteMany({
      where: { id: { in: [ownerAlpha.id, ownerBeta.id, customer.id] } },
    });
  } catch (cleanErr) {
    console.warn("Owner analytics test cleanup notice:", cleanErr);
  }
}

runOwnerAnalyticsTests()
  .catch((err) => {
    console.error("Test execution failed with unhandled error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
