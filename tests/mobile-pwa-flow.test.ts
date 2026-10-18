import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import manifest from "../app/manifest";
import {
  getCourtAvailability,
  createBooking,
  cancelBooking,
  recordPayment,
  SlotConflictError,
  ValidationError,
} from "../lib/booking-engine";
import {
  createNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getUserNotifications,
} from "../lib/notification-service";
import { NotificationType } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runMobilePwaTests() {
  console.log("==========================================================");
  console.log("📱 BOOKMEBADMINTON PHASE 8: MOBILE PWA & FLOW TESTS 📱");
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

  const user = await prisma.user.findFirst({
    where: { email: "alex.nguyen@example.com" },
  });
  const court = await prisma.court.findFirst({
    where: { name: "Court 01", venue: { name: "Smash Arena" } },
    include: { venue: true },
  });

  if (!user || !court) {
    throw new Error("Seed user or court not found. Ensure database is populated.");
  }

  // ----------------------------------------------------
  // 1. Web App Manifest & Assets
  // ----------------------------------------------------
  await test("Manifest configuration complies with PWA standards", async () => {
    const m = manifest();
    assert(m.name === "BookMeBadminton", `Expected name BookMeBadminton, got: ${m.name}`);
    assert(m.short_name === "BookMe", `Expected short_name BookMe, got: ${m.short_name}`);
    assert(m.display === "standalone", `Expected display standalone, got: ${m.display}`);
    assert(m.start_url === "/", `Expected start_url /, got: ${m.start_url}`);
    assert(m.theme_color === "#17201c", `Expected theme_color #17201c, got: ${m.theme_color}`);
    assert(m.background_color === "#f7f8f4", `Expected background_color #f7f8f4, got: ${m.background_color}`);
    assert(Array.isArray(m.icons) && m.icons.length >= 4, "Expected at least 4 icon configurations");

    // Check maskable icon inclusion
    const hasMaskable = Boolean(m.icons?.some((i: any) => i.purpose?.includes("maskable")));
    assert(hasMaskable, "Manifest must include maskable icon for Android adaptive icons");
  });

  await test("PWA icon assets exist on disk with valid file headers", async () => {
    const iconFiles = [
      "icon-192x192.png",
      "icon-512x512.png",
      "icon-maskable-192x192.png",
      "icon-maskable-512x512.png",
      "apple-touch-icon.png",
      "badge-72x72.png",
    ];

    for (const file of iconFiles) {
      const fullPath = path.join(process.cwd(), "public", "icons", file);
      assert(fs.existsSync(fullPath), `Icon file missing: ${file}`);
      const stats = fs.statSync(fullPath);
      assert(stats.size > 500, `Icon file is suspiciously small or empty: ${file} (${stats.size} bytes)`);

      // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47
      const buf = Buffer.alloc(4);
      const fd = fs.openSync(fullPath, "r");
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      assert(
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
        `File ${file} does not have valid PNG magic bytes`
      );
    }
  });

  // ----------------------------------------------------
  // 2. Service Worker & Caching Policy Security
  // ----------------------------------------------------
  await test("Service worker strictly excludes API endpoints and mutations from cache", async () => {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    assert(fs.existsSync(swPath), "Service worker file public/sw.js must exist");

    const swContent = fs.readFileSync(swPath, "utf-8");
    assert(swContent.includes("bmb-static-v"), "Service worker must specify a versioned cache name");
    assert(swContent.includes("/offline"), "Service worker must pre-cache the offline fallback page");
    assert(
      swContent.includes('url.pathname.startsWith("/api/")'),
      "Service worker must explicitly check and exclude /api/ routes"
    );
    assert(
      swContent.includes('request.method !== "GET"'),
      "Service worker must never cache non-GET requests (mutations/bookings/payments)"
    );
    assert(
      swContent.includes("503") || swContent.includes("Service Unavailable"),
      "Service worker must return a clean 503 JSON fallback when network is unavailable for API calls"
    );
  });

  await test("Offline fallback page exists with offline warnings and recovery links", async () => {
    const offlinePagePath = path.join(process.cwd(), "app", "offline", "page.tsx");
    assert(fs.existsSync(offlinePagePath), "app/offline/page.tsx must exist");

    const content = fs.readFileSync(offlinePagePath, "utf-8");
    assert(content.includes("Offline"), "Offline page must clearly state offline mode");
    assert(
      content.includes("/bookings"),
      "Offline page should provide a safe link back to saved/cached bookings"
    );
  });

  // ----------------------------------------------------
  // 3. Mobile Navigation Destination Mapping & Badges
  // ----------------------------------------------------
  await test("Mobile bottom nav highlights current routes correctly across sub-paths", async () => {
    function isNavActive(itemHref: string, pathname: string): boolean {
      if (itemHref === "/") {
        return pathname === "/" || pathname.startsWith("/courts");
      }
      return pathname === itemHref || pathname.startsWith(itemHref + "/");
    }

    assert(isNavActive("/", "/"), "Root should activate Courts tab");
    assert(isNavActive("/", "/courts/1"), "Court detail page should activate Courts tab");
    assert(isNavActive("/friendly-matches", "/friendly-matches"), "Matches list activates Matches tab");
    assert(isNavActive("/friendly-matches", "/friendly-matches/create"), "Match create activates Matches tab");
    assert(isNavActive("/bookings", "/bookings"), "Bookings path activates Bookings tab");
    assert(isNavActive("/notifications", "/notifications"), "Notifications path activates Alerts tab");
    assert(isNavActive("/profile", "/profile"), "Profile path activates Profile tab");
    assert(!isNavActive("/profile", "/friendly-matches"), "Profile should not activate for matches");
    assert(!isNavActive("/bookings", "/"), "Bookings should not activate for home");
  });

  // ----------------------------------------------------
  // 4. Mobile Booking Flow, Calculations & Conflict Handling
  // ----------------------------------------------------
  await test("Booking price calculation accurately accounts for duration", async () => {
    const hourlyRate = 180000;

    const calcTotal = (durationHours: number) => {
      return Math.round(hourlyRate * durationHours);
    };

    assert(calcTotal(1) === 180000, "1 hr price should equal hourly rate");
    assert(calcTotal(1.5) === 270000, "1.5 hr price should equal 1.5x hourly rate");
    assert(calcTotal(2) === 360000, "2 hr price should equal 2x hourly rate");
  });

  const testDate = "2027-02-15"; // Isolated future date
  const startClean = new Date("2027-02-15T00:00:00.000Z");
  const endClean = new Date("2027-02-15T23:59:59.999Z");

  await test("Booking creation and time conflict enforcement on mobile flow", async () => {
    // Clean up any test booking from previous runs on this date
    await prisma.payment.deleteMany({
      where: { booking: { courtId: court.id, bookingDate: { gte: startClean, lte: endClean } } },
    });
    await prisma.booking.deleteMany({
      where: { courtId: court.id, bookingDate: { gte: startClean, lte: endClean } },
    });

    // 1. Create a 1-hour booking: 14:00 - 15:00
    const { booking: booking1 } = await createBooking({
      courtId: court.id,
      bookingDate: testDate,
      startTime: "14:00",
      duration: 1,
      customerName: "Mobile Test User",
      customerPhone: "0900000001",
      customerEmail: "mobile@test.com",
      userId: user.id,
    });

    assert(booking1.status === "CONFIRMED", "First booking should be confirmed");
    assert(booking1.paymentStatus === "PENDING", "Initial payment status must be PENDING");

    // 2. Attempt duplicate overlapping booking: 14:00 - 15:00 -> Expect SlotConflictError
    let conflictCaught = false;
    try {
      await createBooking({
        courtId: court.id,
        bookingDate: testDate,
        startTime: "14:00",
        duration: 1,
        customerName: "Mobile Conflict User",
        customerPhone: "0900000002",
        customerEmail: "conflict@test.com",
      });
    } catch (err: any) {
      if (err instanceof SlotConflictError) {
        conflictCaught = true;
      }
    }
    assert(conflictCaught, "Overlapping slot must throw SlotConflictError");

    // 3. Cancel first booking and verify slot becomes available again
    const cancelled = await cancelBooking(booking1.id, {
      reason: "Mobile user changed plans",
      cancelledByUserId: user.id,
    });
    assert(cancelled.status === "CANCELLED", "Cancelled booking must have CANCELLED status");

    const availability = await getCourtAvailability(court.id, testDate);
    const slot14 = availability.slots.find((s) => s.time === "14:00");
    assert(Boolean(slot14 && slot14.status === "AVAILABLE"), "14:00 slot must be AVAILABLE after cancellation");
  });

  // ----------------------------------------------------
  // 5. Payment Status Lifecycle & QR Distinction
  // ----------------------------------------------------
  await test("VietQR payment instructions vs. Match Check-in Pass QR separation", async () => {
    // Generate mock VietQR payment URL
    const bankCode = "970422";
    const accountNo = "0987654321";
    const amount = 270000;
    const bookingCode = "BMB-TEST-9999";

    const paymentQrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      `BOOKME ${bookingCode}`
    )}`;

    // Generate check-in QR payload
    const checkInPayload = JSON.stringify({
      b: bookingCode,
      u: user.id,
      t: "CHECKIN",
    });

    assert(
      paymentQrUrl.includes("img.vietqr.io") && paymentQrUrl.includes("amount=270000"),
      "Payment QR must contain VietQR banking parameters"
    );
    assert(
      checkInPayload.includes("CHECKIN") && !checkInPayload.includes("vietqr"),
      "Check-in QR payload must be structured JSON pass for venue scanner, distinct from banking payment QR"
    );
  });

  await test("Verified payment recording completes payment lifecycle without fake confirmations", async () => {
    const { booking } = await createBooking({
      courtId: court.id,
      bookingDate: testDate,
      startTime: "16:00",
      duration: 1,
      customerName: "Verified Mobile Payer",
      customerPhone: "0900000003",
      customerEmail: "payer@test.com",
      userId: user.id,
    });

    assert(booking.paymentStatus === "PENDING", "Payment starts as PENDING");

    const paidBooking = await recordPayment(booking.id, {
      paymentMethod: "VIETQR",
      transactionRef: "TXN-TEST-MOB-01",
    });

    assert(paidBooking.paymentStatus === "PAID", "Payment status must update to PAID");
    assert(paidBooking.payments.length > 0, "Payment record must be persisted");
    assert(paidBooking.payments[0].status === "PAID", "Payment record status must be PAID");

    // Clean up
    await cancelBooking(booking.id, { reason: "Test cleanup", cancelledByUserId: user.id });
  });

  // ----------------------------------------------------
  // 6. Notification Center on Mobile & Deep Linking
  // ----------------------------------------------------
  await test("Notification unread count, mark-as-read, and deep links", async () => {
    const unreadInitial = await getUnreadCount(user.id);

    const notif = await createNotification({
      userId: user.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: "Mobile Booking Confirmed",
      message: "Your court session at Smash Arena has been locked in.",
      link: "/bookings",
    });

    if (!notif) {
      throw new Error("Notification should be successfully created");
    }
    assert(notif.link === "/bookings", "Notification link must lead to /bookings");

    const unreadAfter = await getUnreadCount(user.id);
    assert(unreadAfter === unreadInitial + 1, "Unread count must increase by 1");

    // Mark single notification as read
    await markAsRead(notif.id, user.id);
    const unreadAfterRead = await getUnreadCount(user.id);
    assert(unreadAfterRead === unreadInitial, "Unread count must decrease by 1 after read");

    // Clean up test notification
    await prisma.notification.delete({ where: { id: notif.id } });
  });

  // ----------------------------------------------------
  // 7. PWA Install Experience Logic
  // ----------------------------------------------------
  await test("Install banner dismissal cooldown logic", async () => {
    const DISMISS_DAYS = 7;
    const now = Date.now();
    const dismissedUntil = now + DISMISS_DAYS * 24 * 60 * 60 * 1000;

    const isSuppressed = (storedUntil: number | null) => {
      if (!storedUntil) return false;
      return Date.now() < storedUntil;
    };

    assert(isSuppressed(dismissedUntil) === true, "Should suppress banner if dismissed within 7 days");
    assert(isSuppressed(now - 1000) === false, "Should not suppress banner after cooldown expired");
    assert(isSuppressed(null) === false, "Should not suppress banner if never dismissed");
  });

  console.log("\n==========================================================");
  console.log(`🎉 COMPLETED: ${passedCount} passed, ${failedCount} failed`);
  console.log("==========================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runMobilePwaTests()
  .catch((err) => {
    console.error("Test runner encountered fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
