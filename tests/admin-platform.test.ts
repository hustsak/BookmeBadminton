import { prisma } from "../lib/prisma";
import { getAuthenticatedAdmin } from "../lib/auth";
import {
  logAdminAction,
  getAuditLogs,
  getPlatformConfig,
  updatePlatformConfig,
  getAdminOverviewKPIs,
  getAdminUsers,
  toggleUserSuspension,
  getAdminVenues,
  createAdminVenue,
  updateAdminVenue,
  createAdminCourt,
  updateAdminCourt,
  toggleVenueActive,
  toggleCourtActive,
  getAdminBookings,
  adminCancelBooking,
  getReviewReports,
  resolveReviewReport,
} from "../lib/admin-service";
import {
  BookingStatus,
  PaymentStatus,
  ReviewModerationStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runAdminPlatformTests() {
  console.log("=========================================================");
  console.log("🏸 BOOKMEBADMINTON PHASE 7: ADMIN DASHBOARD & PLATFORM 🏸");
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

  const timestamp = Date.now();

  // Create isolated test users: admin, customer, owner, suspended admin
  const testAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: `admin.test.${timestamp}@bookme.test`,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phone: "0900000001",
    },
  });

  const testCustomer = await prisma.user.create({
    data: {
      name: "Player Regular",
      email: `customer.test.${timestamp}@bookme.test`,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      phone: "0900000002",
    },
  });

  const testOwner = await prisma.user.create({
    data: {
      name: "Owner Regular",
      email: `owner.test.${timestamp}@bookme.test`,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      phone: "0900000003",
    },
  });

  const testSuspendedAdmin = await prisma.user.create({
    data: {
      name: "Suspended Admin",
      email: `suspended.admin.${timestamp}@bookme.test`,
      role: UserRole.ADMIN,
      status: UserStatus.SUSPENDED,
      suspensionReason: "Policy investigation pending",
    },
  });

  let testVenueId = 0;
  let testCourtId = 0;

  try {
    // =========================================================================
    // 1. ADMIN AUTHORIZATION & REJECTION OF UNAUTHORIZED REQUESTS
    // =========================================================================

    await test("1.1: Active Admin access granted with valid credentials", async () => {
      const mockRequest = new Request("http://localhost:3000/api/admin/overview", {
        headers: { "x-user-id": testAdmin.id.toString() },
      });

      const { user, isForbidden } = await getAuthenticatedAdmin(mockRequest);
      assert(user !== null, "Admin user must be resolved from request.");
      assert(user?.role === UserRole.ADMIN, "User role must be ADMIN.");
      assert(!isForbidden, "Active admin should not be forbidden.");
    });

    await test("1.2: Rejection of regular customer accessing admin endpoint (403 Forbidden)", async () => {
      const mockRequest = new Request("http://localhost:3000/api/admin/overview", {
        headers: { "x-user-id": testCustomer.id.toString() },
      });

      const { user, isForbidden } = await getAuthenticatedAdmin(mockRequest);
      assert(user !== null, "User resolved from request.");
      assert(isForbidden, "Customer must be rejected with isForbidden = true.");
    });

    await test("1.3: Rejection of venue owner accessing admin endpoint (403 Forbidden)", async () => {
      const mockRequest = new Request("http://localhost:3000/api/admin/venues", {
        headers: { "x-user-id": testOwner.id.toString() },
      });

      const { user, isForbidden } = await getAuthenticatedAdmin(mockRequest);
      assert(user !== null, "Owner user resolved.");
      assert(isForbidden, "Venue owner must not have admin access (isForbidden = true).");
    });

    await test("1.4: Rejection of suspended administrator (403 Forbidden)", async () => {
      const mockRequest = new Request("http://localhost:3000/api/admin/settings", {
        headers: { "x-user-id": testSuspendedAdmin.id.toString() },
      });

      const { user, isForbidden } = await getAuthenticatedAdmin(mockRequest);
      assert(user !== null, "User resolved.");
      assert(isForbidden, "Suspended admin must be rejected.");
    });

    await test("1.5: Rejection of unauthenticated request without fallback in test mode", async () => {
      const mockRequest = new Request("http://localhost:3000/api/admin/overview");
      const { user, isForbidden } = await getAuthenticatedAdmin(mockRequest, { fallbackToDefault: false });
      assert(user === null, "Unauthenticated request without fallback should return null user.");
      assert(!isForbidden, "Unauthenticated request returns user = null (401 candidate).");
    });

    // =========================================================================
    // 2. USER MANAGEMENT & SUSPENSION
    // =========================================================================

    await test("2.1: Admin searches and filters user list with pagination", async () => {
      const result = await getAdminUsers({
        search: `customer.test.${timestamp}`,
        page: 1,
        limit: 10,
      });

      assert(result.totalCount >= 1, "Should find at least 1 user matching search.");
      assert(result.users[0].email === testCustomer.email, "Matched user email should match.");
    });

    await test("2.2: Admin suspends user account with reason and audit trail", async () => {
      const reason = "Violation of court booking terms and non-attendance";
      const updated = await toggleUserSuspension(testAdmin.id, testCustomer.id, "SUSPEND", reason);

      assert(updated.status === UserStatus.SUSPENDED, "User status must be SUSPENDED.");
      assert(updated.suspensionReason === reason, "Suspension reason must be stored.");
      assert(updated.suspendedAt !== null, "SuspendedAt timestamp must be set.");

      // Check audit log
      const logs = await getAuditLogs({ action: "USER_SUSPEND", adminId: testAdmin.id });
      assert(logs.totalCount >= 1, "Audit log must contain USER_SUSPEND action.");
      assert(logs.logs[0].resourceId === String(testCustomer.id), "Audit log must reference target user.");
      assert(logs.logs[0].reason === reason, "Audit log must record suspension reason.");
    });

    await test("2.3: Admin self-suspension is strictly blocked (prevent lockout)", async () => {
      let threw = false;
      try {
        await toggleUserSuspension(testAdmin.id, testAdmin.id, "SUSPEND", "Testing self suspension");
      } catch (err: any) {
        threw = true;
        assert(err.message.includes("cannot suspend their own active account"), "Expected self-lockout error.");
      }
      assert(threw, "Self-suspension should have thrown an error.");
    });

    await test("2.4: Admin reactivates suspended user", async () => {
      const reactivateReason = "Appeal approved after review";
      const reactivated = await toggleUserSuspension(testAdmin.id, testCustomer.id, "REACTIVATE", reactivateReason);

      assert(reactivated.status === UserStatus.ACTIVE, "User status must be ACTIVE.");
      assert(reactivated.suspensionReason === null, "Suspension reason must be cleared.");
      assert(reactivated.suspendedAt === null, "SuspendedAt timestamp must be cleared.");
    });

    // =========================================================================
    // 3. VENUE & COURT MANAGEMENT WITH SAFETY CHECKS
    // =========================================================================

    await test("3.1: Admin creates venue with initial courts and audit logging", async () => {
      const venue = await createAdminVenue(testAdmin.id, {
        name: `Admin Test Arena ${timestamp}`,
        location: "District 2, HCMC",
        address: "123 Vo Nguyen Giap",
        description: "Standard training facility",
        openTime: "06:00",
        closeTime: "22:00",
        initialCourtCount: 2,
        initialCourtPrice: 150000,
      });

      testVenueId = venue.id;
      testCourtId = venue.courts[0].id;

      assert(venue.name.includes("Admin Test Arena"), "Venue name should match.");
      assert(venue.courts.length === 2, "Should create 2 initial courts.");
      assert(venue.courts[0].priceHour === 150000, "Court price should match.");

      // Check audit log
      const logs = await getAuditLogs({ action: "VENUE_CREATE", adminId: testAdmin.id });
      assert(logs.totalCount >= 1, "VENUE_CREATE audit log should be recorded.");
    });

    await test("3.2: Admin updates venue details and adds a new court", async () => {
      const updatedVenue = await updateAdminVenue(testAdmin.id, testVenueId, {
        description: "Updated description for tournament season",
        closeTime: "23:00",
      });

      assert(updatedVenue.closeTime === "23:00", "Close time should be updated.");

      const newCourt = await createAdminCourt(testAdmin.id, testVenueId, {
        name: "Court 3 (Show Court)",
        priceHour: 180000,
        surface: "Yonex Professional Turf",
      });

      assert(newCourt.name === "Court 3 (Show Court)", "Court name should match.");
      assert(newCourt.priceHour === 180000, "Court price should match.");
    });

    await test("3.3: Court and venue deactivation allowed when no upcoming bookings exist", async () => {
      // Court 2 has no bookings
      const court2 = await prisma.court.findFirst({
        where: { venueId: testVenueId, id: { not: testCourtId } },
      });
      assert(court2 !== null, "Court 2 must exist.");

      const deactivatedCourt = await toggleCourtActive(testAdmin.id, court2!.id, false, "Scheduled repainting");
      assert(deactivatedCourt.isActive === false, "Court should be deactivated.");

      // Reactivate it
      const reactivatedCourt = await toggleCourtActive(testAdmin.id, court2!.id, true, "Repainting completed");
      assert(reactivatedCourt.isActive === true, "Court should be reactivated.");
    });

    await test("3.4: Court deactivation BLOCKED when upcoming confirmed bookings exist", async () => {
      // Create a future booking on testCourtId
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const tomorrowMidnight = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0, 0));

      const booking = await prisma.booking.create({
        data: {
          bookingCode: `BK-SAFE-${timestamp}`,
          userId: testCustomer.id,
          courtId: testCourtId,
          bookingDate: tomorrowMidnight,
          startTime: "14:00",
          endTime: "16:00",
          duration: 2,
          totalPrice: 300000,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      let threw = false;
      try {
        await toggleCourtActive(testAdmin.id, testCourtId, false, "Attempting unsafe deactivation");
      } catch (err: any) {
        threw = true;
        assert(err.message.includes("Cannot deactivate court"), "Must throw Cannot deactivate court error.");
        assert(err.message.includes("upcoming confirmed bookings"), "Must indicate upcoming bookings.");
      }
      assert(threw, "Unsafe court deactivation must be blocked.");

      // Venue deactivation must also be blocked
      let venueThrew = false;
      try {
        await toggleVenueActive(testAdmin.id, testVenueId, false, "Attempting unsafe venue deactivation");
      } catch (err: any) {
        venueThrew = true;
        assert(err.message.includes("Cannot deactivate venue"), "Must throw Cannot deactivate venue error.");
      }
      assert(venueThrew, "Unsafe venue deactivation must be blocked.");

      // Clean up test booking to maintain clean state
      await prisma.booking.delete({ where: { id: booking.id } });
    });

    // =========================================================================
    // 4. BOOKINGS MANAGEMENT & ADMINISTRATIVE CANCELLATION
    // =========================================================================

    await test("4.1: Admin cancels booking with mandatory reason and records audit log", async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 5);

      const booking = await prisma.booking.create({
        data: {
          bookingCode: `BK-ADMIN-CANCEL-${timestamp}`,
          userId: testCustomer.id,
          courtId: testCourtId,
          bookingDate: nextWeek,
          startTime: "18:00",
          endTime: "20:00",
          duration: 2,
          totalPrice: 300000,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      const cancelReason = "Court roof maintenance emergency scheduled";
      const cancelled = await adminCancelBooking(testAdmin.id, booking.id, cancelReason);

      assert(cancelled.status === BookingStatus.CANCELLED, "Booking must be cancelled.");
      assert(cancelled.cancellationReason?.includes(cancelReason), "Cancellation reason must be recorded.");

      // Verify audit log
      const logs = await getAuditLogs({ action: "BOOKING_CANCEL", adminId: testAdmin.id });
      assert(logs.totalCount >= 1, "BOOKING_CANCEL audit log must be recorded.");
      assert(logs.logs[0].reason === cancelReason, "Audit reason should match.");
    });

    await test("4.2: Verified Revenue calculations strictly use verified PAID records", async () => {
      // Create a paid booking and an unpaid booking
      const d = new Date();
      const bPaid = await prisma.booking.create({
        data: {
          bookingCode: `BK-REV-PAID-${timestamp}`,
          userId: testCustomer.id,
          courtId: testCourtId,
          bookingDate: d,
          startTime: "08:00",
          endTime: "09:00",
          duration: 1,
          totalPrice: 150000,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          payments: {
            create: {
              amount: 150000,
              status: PaymentStatus.PAID,
              transactionRef: `TX-REV-${timestamp}`,
              paidAt: new Date(),
            },
          },
        },
      });

      const bUnpaid = await prisma.booking.create({
        data: {
          bookingCode: `BK-REV-UNPAID-${timestamp}`,
          userId: testCustomer.id,
          courtId: testCourtId,
          bookingDate: d,
          startTime: "09:00",
          endTime: "10:00",
          duration: 1,
          totalPrice: 150000,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
          payments: {
            create: {
              amount: 150000,
              status: PaymentStatus.PENDING,
            },
          },
        },
      });

      const overview = await getAdminOverviewKPIs();
      assert(overview.kpis.verifiedPaidRevenue >= 150000, "Verified paid revenue must include paid payment.");

      // Clean up revenue test bookings
      await prisma.payment.deleteMany({ where: { bookingId: { in: [bPaid.id, bUnpaid.id] } } });
      await prisma.booking.deleteMany({ where: { id: { in: [bPaid.id, bUnpaid.id] } } });
    });

    // =========================================================================
    // 5. REVIEW MODERATION
    // =========================================================================

    await test("5.1: Admin resolves reported player review (hides review)", async () => {
      // Create a test match first
      const testMatch = await prisma.match.create({
        data: {
          title: `Moderation Test Match ${timestamp}`,
          creatorId: testAdmin.id,
          venueId: testVenueId,
          courtId: testCourtId,
          date: new Date(),
          startTime: "10:00",
          endTime: "12:00",
          skillLevel: "INTERMEDIATE",
          maxPlayers: 4,
          status: "COMPLETED",
        },
      });

      // Create player review and report
      const review = await prisma.playerReview.create({
        data: {
          matchId: testMatch.id,
          reviewerId: testCustomer.id,
          recipientId: testAdmin.id,
          rating: 1,
          comment: "Inappropriate review text violating community conduct",
          moderationStatus: ReviewModerationStatus.ACTIVE,
        },
      });

      const report = await prisma.reviewReport.create({
        data: {
          reviewId: review.id,
          reporterId: testAdmin.id,
          reason: "Hate speech and harassment",
          status: "PENDING",
        },
      });

      const resolveReason = "Confirmed violation of player conduct guideline #4";
      const resolved = await resolveReviewReport(testAdmin.id, report.id, {
        action: "REVIEW_HIDDEN",
        reason: resolveReason,
      });

      assert(resolved.status === "RESOLVED", "Report status must be RESOLVED.");
      assert(resolved.actionTaken === "REVIEW_HIDDEN", "Action taken must be recorded.");
      assert(resolved.resolutionNotes === resolveReason, "Resolution notes must be stored.");

      // Check review was hidden
      const updatedReview = await prisma.playerReview.findUnique({ where: { id: review.id } });
      assert(updatedReview?.moderationStatus === ReviewModerationStatus.REMOVED, "Review moderationStatus must be REMOVED.");

      // Check audit log
      const logs = await getAuditLogs({ action: "REVIEW_RESOLVE", adminId: testAdmin.id });
      assert(logs.totalCount >= 1, "REVIEW_RESOLVE audit log must be recorded.");
    });

    // =========================================================================
    // 6. PLATFORM SETTINGS & VALIDATION
    // =========================================================================

    await test("6.1: Retrieve singleton platform configuration", async () => {
      const config = await getPlatformConfig();
      assert(config !== null, "Config must be returned.");
      assert(config.id === 1, "Singleton ID must be 1.");
      assert(config.platformName.length > 0, "Platform name must be populated.");
    });

    await test("6.2: Update platform settings with validation and audit log", async () => {
      const updated = await updatePlatformConfig(testAdmin.id, {
        platformName: "BookMeBadminton Pro",
        contactEmail: "admin@bookme.test",
        minBookingDuration: 1,
        maxBookingDuration: 6,
        defaultMaxMatchPlayers: 8,
      }, "Seasonal rule adjustments");

      assert(updated.platformName === "BookMeBadminton Pro", "Platform name updated.");
      assert(updated.maxBookingDuration === 6, "Max booking duration updated.");
      assert(updated.defaultMaxMatchPlayers === 8, "Max match players updated.");

      // Check audit log
      const logs = await getAuditLogs({ action: "SETTINGS_UPDATE", adminId: testAdmin.id });
      assert(logs.totalCount >= 1, "SETTINGS_UPDATE audit log must be recorded.");
    });

    await test("6.3: Settings validation rejects invalid duration logic", async () => {
      let threw = false;
      try {
        await updatePlatformConfig(testAdmin.id, {
          minBookingDuration: 5,
          maxBookingDuration: 2, // min > max!
        });
      } catch (err: any) {
        threw = true;
        assert(err.message.includes("Minimum duration cannot exceed maximum duration"), "Must catch min > max error.");
      }
      assert(threw, "Invalid duration logic must be rejected.");
    });

    // =========================================================================
    // 7. AUDIT LOGS SEARCH & PAGINATION
    // =========================================================================

    await test("7.1: Query audit logs with pagination and search", async () => {
      const result = await getAuditLogs({
        adminId: testAdmin.id,
        page: 1,
        limit: 5,
      });

      assert(result.logs.length > 0, "Should return logged actions.");
      assert(result.totalCount >= 4, "Should have logged multiple admin actions across tests.");
      assert(result.logs[0].admin?.email === testAdmin.email, "Admin identity must be linked.");
    });

  } finally {
    // --- CLEANUP TEST DATA ---
    try {
      await prisma.auditLog.deleteMany({ where: { adminId: testAdmin.id } });
      await prisma.reviewReport.deleteMany({ where: { reporterId: testAdmin.id } });
      await prisma.playerReview.deleteMany({ where: { recipientId: testAdmin.id } });
      await prisma.match.deleteMany({ where: { creatorId: testAdmin.id } });
      await prisma.booking.deleteMany({ where: { userId: testCustomer.id } });
      await prisma.court.deleteMany({ where: { venueId: testVenueId } });
      await prisma.venue.deleteMany({ where: { id: testVenueId } });
      await prisma.user.deleteMany({
        where: { id: { in: [testAdmin.id, testCustomer.id, testOwner.id, testSuspendedAdmin.id] } },
      });
    } catch (cleanupErr) {
      console.warn("Cleanup notice:", cleanupErr);
    }
  }

  console.log("\n=========================================================");
  console.log(`Phase 7 Test Suite Finished: ${passedCount} passed, ${failedCount} failed.`);
  console.log("=========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAdminPlatformTests()
  .catch((err) => {
    console.error("Test runner encountered an error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
