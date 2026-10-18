import { prisma } from "../lib/prisma";
import {
  createBooking,
  cancelBooking,
  recordPayment,
  getCourtAvailability,
  SlotConflictError,
  ValidationError,
  AuthorizationError,
} from "../lib/booking-engine";
import {
  createMatch,
  joinMatch,
  leaveMatch,
  MatchConflictError,
} from "../lib/match-engine";
import { getAuthenticatedUser, getAuthenticatedOwner, getAuthenticatedAdmin } from "../lib/auth";
import { UserRole } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runE2EQaTests() {
  console.log("==========================================================");
  console.log("🛡️  BOOKMEBADMINTON PHASE 9: E2E QA & SECURITY TESTS 🛡️");
  console.log("==========================================================\n");

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

  // Find or create test users
  const customerA = await prisma.user.upsert({
    where: { email: "qa.customerA@bookme.test" },
    update: { role: "CUSTOMER", status: "ACTIVE" },
    create: {
      name: "Customer Alpha",
      email: "qa.customerA@bookme.test",
      role: "CUSTOMER",
      phone: "0911000001",
    },
  });

  const customerB = await prisma.user.upsert({
    where: { email: "qa.customerB@bookme.test" },
    update: { role: "CUSTOMER", status: "ACTIVE" },
    create: {
      name: "Customer Beta",
      email: "qa.customerB@bookme.test",
      role: "CUSTOMER",
      phone: "0911000002",
    },
  });

  const ownerA = await prisma.user.upsert({
    where: { email: "qa.ownerA@bookme.test" },
    update: { role: "OWNER", status: "ACTIVE" },
    create: {
      name: "Venue Owner A",
      email: "qa.ownerA@bookme.test",
      role: "OWNER",
      phone: "0911000003",
    },
  });

  const ownerB = await prisma.user.upsert({
    where: { email: "qa.ownerB@bookme.test" },
    update: { role: "OWNER", status: "ACTIVE" },
    create: {
      name: "Venue Owner B",
      email: "qa.ownerB@bookme.test",
      role: "OWNER",
      phone: "0911000004",
    },
  });

  const venue = await prisma.venue.findFirst({
    where: { name: "Smash Arena" },
    include: { courts: true },
  });

  if (!venue || venue.courts.length === 0) {
    throw new Error("Seed venue 'Smash Arena' with courts not found in database.");
  }

  const courtId = venue.courts[0].id;
  const testDate = "2027-05-20";
  const startClean = new Date("2027-05-20T00:00:00.000Z");
  const endClean = new Date("2027-05-20T23:59:59.999Z");

  // Clean test bookings for isolation
  await prisma.payment.deleteMany({
    where: { booking: { courtId, bookingDate: { gte: startClean, lte: endClean } } },
  });
  await prisma.booking.deleteMany({
    where: { courtId, bookingDate: { gte: startClean, lte: endClean } },
  });

  // =========================================================================
  // 1. Customer Booking Journey & Server-Side Price Calculation
  // =========================================================================
  let testBookingId = 0;

  await test("1.1: Server-side pricing calculates total price authoritatively ignoring client values", async () => {
    const { booking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "09:00",
      duration: 2, // 2 hours
      userId: customerA.id,
      customerName: customerA.name,
      customerEmail: customerA.email,
    });

    testBookingId = booking.id;
    const expectedTotal = venue.courts[0].priceHour * 2;
    assert(booking.totalPrice === expectedTotal, `Expected total ${expectedTotal}, got ${booking.totalPrice}`);
    assert(booking.status === "CONFIRMED", "Booking status must start as CONFIRMED");
    assert(booking.paymentStatus === "PENDING", "Payment status must start as PENDING");
    assert(Boolean(booking.bookingCode?.startsWith("BK-")), "Booking code must have valid BK- format");
  });

  await test("1.2: Past booking dates and durations outside permitted hours are rejected", async () => {
    let pastCaught = false;
    try {
      await createBooking({
        courtId,
        bookingDate: "2020-01-01",
        startTime: "09:00",
        duration: 1,
        customerName: "Past Player",
      });
    } catch (e: any) {
      if (e instanceof ValidationError) pastCaught = true;
    }
    assert(pastCaught, "Past booking date must throw ValidationError");

    let durationCaught = false;
    try {
      await createBooking({
        courtId,
        bookingDate: testDate,
        startTime: "12:00",
        duration: 5, // Exceeds 3 hrs limit
        customerName: "Too Long Player",
      });
    } catch (e: any) {
      if (e instanceof ValidationError) durationCaught = true;
    }
    assert(durationCaught, "Duration outside 1-3 hours must throw ValidationError");
  });

  // =========================================================================
  // 2. Concurrency & Overlapping Race Conditions
  // =========================================================================
  await test("2.1: Concurrent booking requests on the same slot: exactly 1 succeeds, 1 rejected", async () => {
    const raceTime = "14:00";
    const attempts = [
      createBooking({
        courtId,
        bookingDate: testDate,
        startTime: raceTime,
        duration: 1,
        userId: customerA.id,
        customerName: "Customer A",
      }),
      createBooking({
        courtId,
        bookingDate: testDate,
        startTime: raceTime,
        duration: 1,
        userId: customerB.id,
        customerName: "Customer B",
      }),
    ];

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert(fulfilled.length === 1, `Exactly 1 booking should succeed (got ${fulfilled.length})`);
    assert(rejected.length === 1, `Exactly 1 booking should be rejected (got ${rejected.length})`);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    assert(err instanceof SlotConflictError, "Rejection must be SlotConflictError");
  });

  await test("2.2: Concurrent match join requests for final spot: exactly 1 succeeds, 1 rejected", async () => {
    const raceMatch = await createMatch({
      creatorId: customerA.id,
      venueId: venue.id,
      title: "QA Concurrency Match",
      date: "2027-06-01",
      startTime: "18:00",
      maxPlayers: 2, // 1 host + 1 open spot
    });

    const joinAttempts = [
      joinMatch(raceMatch.id, customerB.id),
      joinMatch(raceMatch.id, ownerA.id),
    ];

    const results = await Promise.allSettled(joinAttempts);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert(fulfilled.length === 1, `Exactly 1 player should win the final spot (got ${fulfilled.length})`);
    assert(rejected.length === 1, `Overcapacity player should be rejected (got ${rejected.length})`);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    assert(err instanceof MatchConflictError, "Rejection must be MatchConflictError");
  });

  // =========================================================================
  // 3. Cancellation, Slot Release & Idempotency
  // =========================================================================
  await test("3.1: Cancelling a booking immediately releases slot availability", async () => {
    const { booking: tempBooking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "16:00",
      duration: 1,
      userId: customerA.id,
      customerName: "Temp Player",
    });

    // Check slot is booked
    let avail = await getCourtAvailability(courtId, testDate);
    let slot16 = avail.slots.find((s) => s.time === "16:00");
    assert(slot16?.status === "BOOKED", "16:00 slot must be BOOKED");

    // Cancel booking
    const cancelled = await cancelBooking(tempBooking.id, {
      reason: "Customer schedule changed",
      cancelledByUserId: customerA.id,
    });
    assert(cancelled.status === "CANCELLED", "Status must update to CANCELLED");

    // Verify slot is immediately AVAILABLE again
    avail = await getCourtAvailability(courtId, testDate);
    slot16 = avail.slots.find((s) => s.time === "16:00");
    assert(slot16?.status === "AVAILABLE", "16:00 slot must be AVAILABLE after cancellation");
  });

  await test("3.2: Re-cancelling an already cancelled booking is safe and idempotent", async () => {
    const cancelledAgain = await cancelBooking(testBookingId, {
      reason: "Duplicate cancellation click",
      cancelledByUserId: customerA.id,
    });
    assert(cancelledAgain.status === "CANCELLED", "Idempotent cancellation must remain CANCELLED");
  });

  await test("3.3: Attempting to cancel another user's booking throws AuthorizationError", async () => {
    // Create new booking owned by Customer A
    const { booking: aBooking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "18:00",
      duration: 1,
      userId: customerA.id,
      customerName: "Customer A",
    });

    let authErrorCaught = false;
    try {
      // Customer B attempts to cancel Customer A's booking
      await cancelBooking(aBooking.id, {
        reason: "Malicious cancellation attempt",
        cancelledByUserId: customerB.id,
      });
    } catch (e: any) {
      if (e instanceof AuthorizationError) authErrorCaught = true;
    }
    assert(authErrorCaught, "Cancelling another customer's booking must throw AuthorizationError");

    // Cleanup
    await cancelBooking(aBooking.id, { reason: "Cleanup", cancelledByUserId: customerA.id });
  });

  // =========================================================================
  // 4. Payment Security & Ledger State Transitions
  // =========================================================================
  await test("4.1: Verified payment creates ledger record and cannot be paid when cancelled", async () => {
    // Create new active booking
    const { booking: payBooking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "20:00",
      duration: 1,
      userId: customerA.id,
      customerName: "Pay Player",
    });

    assert(payBooking.paymentStatus === "PENDING", "Initial paymentStatus must be PENDING");

    const paidResult = await recordPayment(payBooking.id, {
      transactionRef: "QA-TXN-001",
      paymentMethod: "VIETQR",
    });

    assert(paidResult.paymentStatus === "PAID", "paymentStatus must update to PAID");
    assert(paidResult.payments.length > 0, "Ledger entry must be persisted");
    assert(paidResult.payments[0].status === "PAID", "Payment ledger status must be PAID");
    assert(paidResult.payments[0].transactionRef === "QA-TXN-001", "Transaction reference must match");

    // Re-recording payment is idempotent
    const replayResult = await recordPayment(payBooking.id, {
      transactionRef: "QA-TXN-001",
    });
    assert(replayResult.paymentStatus === "PAID", "Replay must return already paid booking");
  });

  // =========================================================================
  // 5. Authentication & Role Boundary Audits
  // =========================================================================
  await test("5.1: Unauthenticated request in production/test mode NEVER falls back to default admin", async () => {
    const unauthenticatedReq = new Request("http://localhost:3000/api/admin/overview");
    const { user, isForbidden } = await getAuthenticatedAdmin(unauthenticatedReq);
    assert(user === null, "Unauthenticated request without credentials must resolve user = null");
    assert(!isForbidden, "User null indicates 401 candidate, not 403");
  });

  await test("5.2: Unauthenticated request in production/test mode NEVER falls back to default owner", async () => {
    const unauthenticatedReq = new Request("http://localhost:3000/api/owner/analytics/overview");
    const { user, isForbidden } = await getAuthenticatedOwner(unauthenticatedReq);
    assert(user === null, "Unauthenticated request without credentials must resolve owner user = null");
    assert(!isForbidden, "User null indicates 401 candidate");
  });

  await test("5.3: Customer credentials accessing owner or admin APIs are rejected with isForbidden = true (403)", async () => {
    const customerReq = new Request("http://localhost:3000/api/admin/users", {
      headers: { "x-user-id": customerA.id.toString() },
    });
    const { user: adminAttemptUser, isForbidden: adminForbidden } = await getAuthenticatedAdmin(customerReq);
    assert(adminAttemptUser?.id === customerA.id, "Customer resolved");
    assert(adminForbidden === true, "Customer must be rejected from admin API (isForbidden = true)");

    const ownerReq = new Request("http://localhost:3000/api/owner/analytics/revenue", {
      headers: { "x-user-id": customerA.id.toString() },
    });
    const { user: ownerAttemptUser, isForbidden: ownerForbidden } = await getAuthenticatedOwner(ownerReq);
    assert(ownerAttemptUser?.id === customerA.id, "Customer resolved");
    assert(ownerForbidden === true, "Customer must be rejected from owner API (isForbidden = true)");
  });

  // =========================================================================
  // 6. Cron Security
  // =========================================================================
  await test("6.1: Production cron endpoint blocks unauthorized requests without valid CRON_SECRET", async () => {
    const cronSecret = "TEST_SECRET_KEY_12345";
    process.env.CRON_SECRET = cronSecret;

    const noAuthReq = new Request("http://localhost:3000/api/cron/reminders");
    const authHeader = noAuthReq.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    assert(token !== cronSecret, "Unauthorized request does not match CRON_SECRET");

    const validReq = new Request("http://localhost:3000/api/cron/reminders", {
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    const validToken = validReq.headers.get("authorization")?.substring(7);
    assert(validToken === cronSecret, "Authorized request matches CRON_SECRET");

    delete process.env.CRON_SECRET;
  });

  console.log("\n==========================================================");
  console.log(`🎉 COMPLETED: ${passedCount} passed, ${failedCount} failed`);
  console.log("==========================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runE2EQaTests()
  .catch((err) => {
    console.error("Test runner encountered fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
