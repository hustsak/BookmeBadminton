import { prisma } from "../lib/prisma";
import {
  getCourtAvailability,
  createBooking,
  rescheduleBooking,
  cancelBooking,
  recordPayment,
  intervalsOverlap,
  parseBookingDateMidnight,
  SlotConflictError,
  ValidationError,
  NotFoundError,
} from "../lib/booking-engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("🏸 BOOKMEBADMINTON COMPREHENSIVE TEST SUITE 🏸");
  console.log("=================================================\n");

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

  // Find demo test courts
  const smashCourt = await prisma.court.findFirst({
    where: { name: "Court 01", venue: { name: "Smash Arena" } },
    include: { venue: true },
  });
  const court2 = await prisma.court.findFirst({
    where: { name: "Court 02", venue: { name: "Smash Arena" } },
    include: { venue: true },
  });
  const proCourt = await prisma.court.findFirst({
    where: { venue: { name: "Pro Court" } },
    include: { venue: true },
  });

  if (!smashCourt || !court2 || !proCourt) {
    throw new Error("Required courts not found in database. Run scripts/seed-data.ts first.");
  }

  const courtId = smashCourt.id;
  const testDate = "2026-12-01"; // Future date for clean test isolation
  const testDate2 = "2026-12-02";

  // Clean any previous test bookings on these future dates
  const startClean = new Date("2026-12-01T00:00:00.000Z");
  const endClean = new Date("2026-12-05T23:59:59.999Z");
  await prisma.payment.deleteMany({
    where: { booking: { courtId: { in: [courtId, court2.id, proCourt.id] }, bookingDate: { gte: startClean, lte: endClean } } },
  });
  await prisma.booking.deleteMany({
    where: { courtId: { in: [courtId, court2.id, proCourt.id] }, bookingDate: { gte: startClean, lte: endClean } },
  });
  await prisma.maintenanceBlock.deleteMany({
    where: { courtId: { in: [courtId, court2.id, proCourt.id] }, date: { gte: startClean, lte: endClean } },
  });

  // -------------------------------------------------------------
  // TEST 1: Available and Occupied Slots
  // -------------------------------------------------------------
  await test("1. Available and occupied slots check", async () => {
    const availBefore = await getCourtAvailability(courtId, testDate);
    assert(availBefore.availableSlotsCount > 0, "Expected available slots before booking");
    const slot08 = availBefore.slots.find((s) => s.time === "08:00");
    assert(slot08?.status === "AVAILABLE", "08:00 should be AVAILABLE initially");

    // Book 08:00 for 1h
    const { booking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "08:00",
      duration: 1,
      customerName: "Test Player 1",
      customerEmail: "player1@test.com",
    });
    assert(booking.status === "CONFIRMED", "Booking status should be CONFIRMED");

    // Recheck availability
    const availAfter = await getCourtAvailability(courtId, testDate);
    const slot08After = availAfter.slots.find((s) => s.time === "08:00");
    const slot09After = availAfter.slots.find((s) => s.time === "09:00");
    assert(slot08After?.status === "BOOKED", "08:00 should be BOOKED after reservation");
    assert(slot09After?.status === "AVAILABLE", "09:00 should remain AVAILABLE");
  });

  // -------------------------------------------------------------
  // TEST 2: Different Courts and Dates Isolation
  // -------------------------------------------------------------
  await test("2. Different courts and dates do not collide", async () => {
    // Court 01 is booked at 08:00 on testDate. Court 02 should still be AVAILABLE at 08:00 on testDate.
    const availCourt2 = await getCourtAvailability(court2.id, testDate);
    const c2Slot08 = availCourt2.slots.find((s) => s.time === "08:00");
    assert(c2Slot08?.status === "AVAILABLE", "Court 2 at 08:00 should be AVAILABLE");

    // Court 01 on testDate2 should also still be AVAILABLE at 08:00
    const availDate2 = await getCourtAvailability(courtId, testDate2);
    const date2Slot08 = availDate2.slots.find((s) => s.time === "08:00");
    assert(date2Slot08?.status === "AVAILABLE", "Court 1 on date 2 at 08:00 should be AVAILABLE");
  });

  // -------------------------------------------------------------
  // TEST 3: Consecutive Slot & Multi-hour Duration Selection
  // -------------------------------------------------------------
  await test("3. Consecutive slot and duration selection", async () => {
    // Book a 2-hour slot from 10:00 to 12:00
    const { booking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "10:00",
      duration: 2,
      customerName: "Multi-hour Player",
      customerEmail: "multihour@test.com",
    });
    assert(booking.endTime === "12:00", "End time should be 12:00");

    const avail = await getCourtAvailability(courtId, testDate);
    const s10 = avail.slots.find((s) => s.time === "10:00");
    const s11 = avail.slots.find((s) => s.time === "11:00");
    const s12 = avail.slots.find((s) => s.time === "12:00");

    assert(s10?.status === "BOOKED", "10:00 should be BOOKED");
    assert(s11?.status === "BOOKED", "11:00 should be BOOKED");
    assert(s12?.status === "AVAILABLE", "12:00 should be AVAILABLE");
  });

  // -------------------------------------------------------------
  // TEST 4: Live Server-side Price Calculation
  // -------------------------------------------------------------
  await test("4. Correct live server price calculation (prevents client tampering)", async () => {
    const dur = 3;
    const { booking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "13:00",
      duration: dur,
      customerName: "Price Check Player",
      customerEmail: "pricecheck@test.com",
    });
    const expected = smashCourt.priceHour * dur;
    assert(booking.totalPrice === expected, `Expected totalPrice ${expected}, got ${booking.totalPrice}`);
    assert(booking.pricePerHour === smashCourt.priceHour, "Price per hour recorded correctly");
  });

  // -------------------------------------------------------------
  // TEST 5: Past Dates and Invalid Inputs
  // -------------------------------------------------------------
  await test("5. Past dates and invalid inputs rejection", async () => {
    let pastCaught = false;
    try {
      await createBooking({
        courtId,
        bookingDate: "2020-01-01",
        startTime: "08:00",
        duration: 1,
      });
    } catch (e: any) {
      if (e instanceof ValidationError) pastCaught = true;
    }
    assert(pastCaught, "Should reject booking in the past");

    let durationCaught = false;
    try {
      await createBooking({
        courtId,
        bookingDate: testDate,
        startTime: "09:00",
        duration: 5, // invalid duration > 3
      });
    } catch (e: any) {
      if (e instanceof ValidationError) durationCaught = true;
    }
    assert(durationCaught, "Should reject duration > 3");

    let timeFormatCaught = false;
    try {
      await createBooking({
        courtId,
        bookingDate: testDate,
        startTime: "invalid-time",
        duration: 1,
      });
    } catch (e: any) {
      if (e instanceof ValidationError) timeFormatCaught = true;
    }
    assert(timeFormatCaught, "Should reject invalid time format");
  });

  // -------------------------------------------------------------
  // TEST 6: Cancelled Bookings Releasing Availability
  // -------------------------------------------------------------
  await test("6. Cancelled bookings release availability", async () => {
    // Book 19:00
    const { booking } = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "19:00",
      duration: 1,
      customerName: "Cancelling Player",
      customerEmail: "cancel@test.com",
    });

    let avail = await getCourtAvailability(courtId, testDate);
    let s19 = avail.slots.find((s) => s.time === "19:00");
    assert(s19?.status === "BOOKED", "19:00 should be BOOKED before cancel");

    // Cancel booking
    await cancelBooking(booking.id, { reason: "Player schedule change" });

    // Verify slot is instantly released
    avail = await getCourtAvailability(courtId, testDate);
    s19 = avail.slots.find((s) => s.time === "19:00");
    assert(s19?.status === "AVAILABLE", "19:00 should be AVAILABLE after cancellation");

    // Re-booking the same slot should now succeed cleanly!
    const rebook = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "19:00",
      duration: 1,
      customerName: "New Player",
      customerEmail: "new@test.com",
    });
    assert(rebook.booking.status === "CONFIRMED", "Re-booking cancelled slot should succeed");
  });

  // -------------------------------------------------------------
  // TEST 7: Overlapping Intervals with Different Start Times
  // Rule: newStart < existingEnd AND newEnd > existingStart
  // -------------------------------------------------------------
  await test("7. Overlapping intervals with different start times properly rejected", async () => {
    // Book 16:00 - 18:00 (duration 2)
    await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "16:00",
      duration: 2,
      customerName: "Block Player",
      customerEmail: "block@test.com",
    });

    // Test attempt A: Inside overlap: 17:00 - 18:00 (starts inside existing)
    let overlapACaught = false;
    try {
      await createBooking({
        courtId,
        bookingDate: testDate,
        startTime: "17:00",
        duration: 1,
      });
    } catch (e: any) {
      if (e instanceof SlotConflictError) overlapACaught = true;
    }
    assert(overlapACaught, "Should reject 17:00-18:00 inside 16:00-18:00");

    // Test attempt B: Straddle overlap: 15:00 - 17:00 (ends inside existing)
    let overlapBCaught = false;
    try {
      await createBooking({
        courtId,
        bookingDate: testDate,
        startTime: "15:00",
        duration: 2,
      });
    } catch (e: any) {
      if (e instanceof SlotConflictError) overlapBCaught = true;
    }
    assert(overlapBCaught, "Should reject 15:00-17:00 overlapping 16:00-18:00");

    // Test attempt C: Non-overlapping: 18:00 - 19:00 (touches border, valid)
    const validTouch = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "18:00",
      duration: 1,
      customerName: "Border Player",
      customerEmail: "border@test.com",
    });
    assert(validTouch.booking.status === "CONFIRMED", "18:00-19:00 touching border should succeed");
  });

  // -------------------------------------------------------------
  // TEST 8: Concurrent Requests (Race Conditions)
  // -------------------------------------------------------------
  await test("8. Concurrency protection: Two simultaneous requests for the same slot", async () => {
    const slotTime = "20:00";
    const attempts = [
      createBooking({
        courtId,
        bookingDate: testDate,
        startTime: slotTime,
        duration: 1,
        customerName: "User Alpha",
        customerEmail: "alpha@concurrent.test",
      }),
      createBooking({
        courtId,
        bookingDate: testDate,
        startTime: slotTime,
        duration: 1,
        customerName: "User Beta",
        customerEmail: "beta@concurrent.test",
      }),
    ];

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert(fulfilled.length === 1, `Exactly one request should succeed (got ${fulfilled.length})`);
    assert(rejected.length === 1, `Exactly one request should be rejected (got ${rejected.length})`);
    const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
    assert(
      rejectedError instanceof SlotConflictError,
      `Rejected reason should be SlotConflictError, got ${rejectedError}`
    );
  });

  // -------------------------------------------------------------
  // TEST 9: Idempotency & Payment Verification
  // -------------------------------------------------------------
  await test("9. Duplicate submission idempotency & verified payment ledger", async () => {
    const idemKey = `TEST-IDEM-${Date.now()}`;
    const firstCall = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "21:00",
      duration: 1,
      customerName: "Idempotent User",
      customerEmail: "idem@test.com",
      idempotencyKey: idemKey,
    });
    assert(!firstCall.isIdempotentReplay, "First call should create new booking");

    // Second call with same idempotencyKey
    const secondCall = await createBooking({
      courtId,
      bookingDate: testDate,
      startTime: "21:00",
      duration: 1,
      customerName: "Idempotent User",
      customerEmail: "idem@test.com",
      idempotencyKey: idemKey,
    });
    assert(secondCall.isIdempotentReplay, "Second call should be detected as idempotent replay");
    assert(secondCall.booking.id === firstCall.booking.id, "Should return identical booking ID");

    // Verify payment
    assert(firstCall.booking.paymentStatus === "PENDING", "Initial paymentStatus should be PENDING");
    const paidBooking = await recordPayment(firstCall.booking.id, {
      transactionRef: "BIDV-TEST-9988",
      paymentMethod: "VIETQR",
    });
    assert(paidBooking.paymentStatus === "PAID", "paymentStatus should be updated to PAID");
    assert(paidBooking.payments.length > 0, "Payment record should be created in ledger");
    assert(paidBooking.payments[0].status === "PAID", "Payment ledger record status should be PAID");
  });

  // -------------------------------------------------------------
  // TEST 10: Maintenance Blocks
  // -------------------------------------------------------------
  await test("10. Maintenance blocks render slots unavailable and block bookings", async () => {
    const mDate = testDate2;
    // Add maintenance block for 14:00 - 16:00
    const mBlock = await prisma.maintenanceBlock.create({
      data: {
        courtId,
        date: new Date(`${mDate}T12:00:00.000Z`),
        startTime: "14:00",
        endTime: "16:00",
        reason: "LED Light Fixture Maintenance",
      },
    });

    const avail = await getCourtAvailability(courtId, mDate);
    const s14 = avail.slots.find((s) => s.time === "14:00");
    const s15 = avail.slots.find((s) => s.time === "15:00");

    assert(s14?.status === "MAINTENANCE", "14:00 should have status MAINTENANCE");
    assert(s15?.status === "MAINTENANCE", "15:00 should have status MAINTENANCE");
    assert(Boolean(s14?.reason?.includes("LED Light")), "Reason should include maintenance description");

    // Attempting to book during maintenance should fail
    let maintenanceBlocked = false;
    try {
      await createBooking({
        courtId,
        bookingDate: mDate,
        startTime: "14:00",
        duration: 1,
      });
    } catch (e: any) {
      if (e instanceof SlotConflictError) maintenanceBlocked = true;
    }
    assert(maintenanceBlocked, "Should block booking during maintenance window");

    // Remove maintenance block
    await prisma.maintenanceBlock.delete({ where: { id: mBlock.id } });
    const availAfter = await getCourtAvailability(courtId, mDate);
    const s14After = availAfter.slots.find((s) => s.time === "14:00");
    assert(s14After?.status === "AVAILABLE", "Slot should be AVAILABLE after maintenance removed");
  });

  // -------------------------------------------------------------
  // TEST 11: Authorization & Venue Isolation
  // -------------------------------------------------------------
  await test("11. Authorization & Venue Owner isolation", async () => {
    // Owner 1 owns Smash Arena (courtId)
    // Owner 2 owns Pro Court (proCourt.id)
    const owner1 = await prisma.user.findFirst({ where: { email: "owner1@bookme.test" } });
    const owner2 = await prisma.user.findFirst({ where: { email: "owner2@bookme.test" } });
    assert(Boolean(owner1 && owner2), "Both owners must exist");

    // Query owned venues for Owner 1
    const owner1Venues = await prisma.venue.findMany({ where: { ownerId: owner1!.id } });
    const owner1VenueIds = owner1Venues.map((v) => v.id);
    assert(!owner1VenueIds.includes(proCourt.venueId), "Owner 1 must NOT own Pro Court");

    // Verify Pro Court belongs to Owner 2
    assert(proCourt.venue.ownerId === owner2!.id, "Pro Court must belong to Owner 2");
  });

  // -------------------------------------------------------------
  // TEST 12: Concurrency: Partially Overlapping Simultaneous Requests
  // Overlap rule: newStart < existingEnd AND newEnd > existingStart
  // Request A: 10:00 - 12:00 (dur 2)
  // Request B: 11:00 - 13:00 (dur 2)
  // Exactly 1 must succeed, 1 must receive SlotConflictError
  // -------------------------------------------------------------
  await test("12. Concurrency: Partially overlapping simultaneous requests (10:00-12:00 vs 11:00-13:00)", async () => {
    const concurrentDate = "2026-12-03";
    const attempts = [
      createBooking({
        courtId,
        bookingDate: concurrentDate,
        startTime: "10:00",
        duration: 2,
        customerName: "Racer Partial 1",
        customerEmail: "racer1@partial.test",
      }),
      createBooking({
        courtId,
        bookingDate: concurrentDate,
        startTime: "11:00",
        duration: 2,
        customerName: "Racer Partial 2",
        customerEmail: "racer2@partial.test",
      }),
    ];

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert(fulfilled.length === 1, `Exactly 1 request should succeed (got ${fulfilled.length})`);
    assert(rejected.length === 1, `Exactly 1 request should be rejected (got ${rejected.length})`);
    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    assert(
      rejectedReason instanceof SlotConflictError,
      `Rejected error should be SlotConflictError, got ${rejectedReason}`
    );
  });

  // -------------------------------------------------------------
  // TEST 13: Concurrency: Back-to-Back Non-Overlapping Bookings Both Succeed
  // Request A: 14:00 - 15:00
  // Request B: 15:00 - 16:00
  // Borders touch at 15:00, but do NOT overlap! Both must succeed!
  // -------------------------------------------------------------
  await test("13. Concurrency: Simultaneous back-to-back non-overlapping bookings both succeed", async () => {
    const concurrentDate = "2026-12-03";
    const [bookingA, bookingB] = await Promise.all([
      createBooking({
        courtId,
        bookingDate: concurrentDate,
        startTime: "14:00",
        duration: 1,
        customerName: "Racer BackToBack 1",
        customerEmail: "b2b1@test.com",
      }),
      createBooking({
        courtId,
        bookingDate: concurrentDate,
        startTime: "15:00",
        duration: 1,
        customerName: "Racer BackToBack 2",
        customerEmail: "b2b2@test.com",
      }),
    ]);

    assert(bookingA.booking.status === "CONFIRMED", "Booking A (14:00-15:00) must succeed");
    assert(bookingB.booking.status === "CONFIRMED", "Booking B (15:00-16:00) must succeed");
  });

  // -------------------------------------------------------------
  // TEST 14: Concurrency: Different Courts Proceed Independently Without Contention
  // Request A: Court 1 at 17:00 - 18:00
  // Request B: Court 2 at 17:00 - 18:00
  // Both requests must succeed without lock collision
  // -------------------------------------------------------------
  await test("14. Concurrency: Bookings for different courts proceed independently", async () => {
    const concurrentDate = "2026-12-03";
    const [resCourt1, resCourt2] = await Promise.all([
      createBooking({
        courtId: courtId,
        bookingDate: concurrentDate,
        startTime: "17:00",
        duration: 1,
        customerName: "Court 1 Racer",
        customerEmail: "court1@test.com",
      }),
      createBooking({
        courtId: court2.id,
        bookingDate: concurrentDate,
        startTime: "17:00",
        duration: 1,
        customerName: "Court 2 Racer",
        customerEmail: "court2@test.com",
      }),
    ]);

    assert(resCourt1.booking.courtId === courtId, "Booking 1 confirmed on Court 1");
    assert(resCourt2.booking.courtId === court2.id, "Booking 2 confirmed on Court 2");
    assert(resCourt1.booking.status === "CONFIRMED", "Court 1 booking must be CONFIRMED");
    assert(resCourt2.booking.status === "CONFIRMED", "Court 2 booking must be CONFIRMED");
  });

  // -------------------------------------------------------------
  // TEST 15: Rescheduling Concurrency & Overlap Prevention
  // -------------------------------------------------------------
  await test("15. Rescheduling cannot introduce an overlap and respects concurrency", async () => {
    const rDate = "2026-12-04";
    // Setup booking A: 09:00 - 10:00
    const { booking: bA } = await createBooking({
      courtId,
      bookingDate: rDate,
      startTime: "09:00",
      duration: 1,
      customerName: "Reschedule Player A",
      customerEmail: "reschedA@test.com",
    });

    // Setup booking B: 10:00 - 11:00 (occupied slot)
    await createBooking({
      courtId,
      bookingDate: rDate,
      startTime: "10:00",
      duration: 1,
      customerName: "Occupying Player B",
      customerEmail: "reschedB@test.com",
    });

    // 1. Attempt to reschedule booking A to 10:00 - 11:00 (conflicts with B)
    let conflictCaught = false;
    try {
      await rescheduleBooking({
        bookingId: bA.id,
        newBookingDate: rDate,
        newStartTime: "10:00",
        newDuration: 1,
      });
    } catch (e: any) {
      if (e instanceof SlotConflictError) conflictCaught = true;
    }
    assert(conflictCaught, "Rescheduling into an occupied slot must throw SlotConflictError");

    // 2. Reschedule booking A to 11:00 - 12:00 (free slot)
    const rescheduledA = await rescheduleBooking({
      bookingId: bA.id,
      newBookingDate: rDate,
      newStartTime: "11:00",
      newDuration: 1,
    });
    assert(rescheduledA.startTime === "11:00", "Start time should be updated to 11:00");
    assert(rescheduledA.endTime === "12:00", "End time should be updated to 12:00");

    // 3. Verify original slot 09:00 is now released
    const avail = await getCourtAvailability(courtId, rDate);
    const s09 = avail.slots.find((s) => s.time === "09:00");
    assert(s09?.status === "AVAILABLE", "Slot 09:00 should now be AVAILABLE after rescheduling away");
  });

  // -------------------------------------------------------------
  // TEST 16: Active Pending Bookings Block Availability & Transaction Rollback
  // -------------------------------------------------------------
  await test("16. Active pending bookings block availability & failed transactions leave no partial data", async () => {
    const pDate = "2026-12-04";
    // 1. Create a booking that is active with paymentStatus: PENDING
    const { booking: pendingBooking } = await createBooking({
      courtId,
      bookingDate: pDate,
      startTime: "15:00",
      duration: 1,
      customerName: "Pending Customer",
      customerEmail: "pending@test.com",
    });
    assert(pendingBooking.paymentStatus === "PENDING", "Payment status should be PENDING");

    // Verify availability shows it as BOOKED (blocking)
    const avail = await getCourtAvailability(courtId, pDate);
    const s15 = avail.slots.find((s) => s.time === "15:00");
    assert(s15?.status === "BOOKED", "Slot with pending payment must still block availability");

    // Attempting overlapping reservation must fail
    let blockedByPending = false;
    try {
      await createBooking({
        courtId,
        bookingDate: pDate,
        startTime: "15:00",
        duration: 1,
        customerName: "Second Player",
      });
    } catch (e: any) {
      if (e instanceof SlotConflictError) blockedByPending = true;
    }
    assert(blockedByPending, "Active booking with pending payment must block other reservations");

    // 2. Transaction rollback: Invalid parameters or errors leave no partial data
    const bookingCountBefore = await prisma.booking.count({
      where: { courtId, bookingDate: parseBookingDateMidnight(pDate), startTime: "17:00" },
    });

    let txFailed = false;
    try {
      await createBooking({
        courtId,
        bookingDate: pDate,
        startTime: "17:00",
        duration: 0, // Invalid duration throws ValidationError
      });
    } catch (e: any) {
      if (e instanceof ValidationError) txFailed = true;
    }
    assert(txFailed, "Invalid booking creation should fail with ValidationError");

    const bookingCountAfter = await prisma.booking.count({
      where: { courtId, bookingDate: parseBookingDateMidnight(pDate), startTime: "17:00" },
    });
    assert(bookingCountBefore === bookingCountAfter, "Failed transaction must leave no partial bookings in DB");
  });

  console.log("\n=================================================");
  console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test runner crashed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
