import { prisma } from "../lib/prisma";
import {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../lib/notification-service";
import {
  createMatchInvitation,
  respondToInvitation,
  listUserInvitations,
} from "../lib/invitation-service";
import { processReminders } from "../lib/reminder-service";
import {
  createBooking,
  cancelBooking,
  recordPayment,
} from "../lib/booking-engine";
import {
  createMatch,
  joinMatch,
  leaveMatch,
  cancelMatch,
} from "../lib/match-engine";
import {
  NotificationType,
  InvitationStatus,
  MatchStatus,
  BookingStatus,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runNotificationTests() {
  console.log("=================================================");
  console.log("🏸 BOOKMEBADMINTON NOTIFICATIONS & SOCIAL TESTS 🏸");
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

  // 1. Setup Test Users
  const userA = await prisma.user.upsert({
    where: { email: "notif.userA@test.com" },
    update: {},
    create: {
      name: "Notif User Alpha",
      email: "notif.userA@test.com",
      role: "CUSTOMER",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "notif.userB@test.com" },
    update: {},
    create: {
      name: "Notif User Beta",
      email: "notif.userB@test.com",
      role: "CUSTOMER",
    },
  });

  const userC = await prisma.user.upsert({
    where: { email: "notif.userC@test.com" },
    update: {},
    create: {
      name: "Notif User Gamma",
      email: "notif.userC@test.com",
      role: "CUSTOMER",
    },
  });

  // Reset preferences and notifications for test users to clean defaults
  await prisma.notification.deleteMany({
    where: { userId: { in: [userA.id, userB.id, userC.id] } },
  });
  await prisma.notificationPreference.deleteMany({
    where: { userId: { in: [userA.id, userB.id, userC.id] } },
  });

  // Setup Test Venue and Court
  let venue = await prisma.venue.findFirst({
    include: { courts: true },
  });

  if (!venue || venue.courts.length === 0) {
    venue = await prisma.venue.create({
      data: {
        name: "Notification Test Arena",
        location: "District 7, HCMC",
        address: "123 Smash Boulevard",
        openTime: "06:00",
        closeTime: "23:00",
        courts: {
          create: [
            { name: "Court N1", priceHour: 100000 },
            { name: "Court N2", priceHour: 120000 },
          ],
        },
      },
      include: { courts: true },
    });
  }

  const court = venue.courts[0];

  // -------------------------------------------------------------
  // Test 1: Listing only the current user's notifications
  // -------------------------------------------------------------
  await test("Listing only the current user's notifications", async () => {
    // Clear existing notifications for test users
    await prisma.notification.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });

    await createNotification({
      userId: userA.id,
      type: NotificationType.SYSTEM,
      title: "Notice for User A",
      message: "Hello Alpha",
    });

    await createNotification({
      userId: userB.id,
      type: NotificationType.SYSTEM,
      title: "Notice for User B",
      message: "Hello Beta",
    });

    const listA = await getUserNotifications(userA.id);
    const listB = await getUserNotifications(userB.id);

    assert(listA.notifications.length === 1, "User A should have exactly 1 notification.");
    assert(listA.notifications[0].title === "Notice for User A", "User A should see their own notice.");
    assert(listB.notifications.length === 1, "User B should have exactly 1 notification.");
    assert(listB.notifications[0].title === "Notice for User B", "User B should see their own notice.");
  });

  // -------------------------------------------------------------
  // Test 2: Unread count accuracy
  // -------------------------------------------------------------
  await test("Unread count accuracy", async () => {
    const initialCount = await getUnreadCount(userA.id);
    assert(initialCount === 1, "User A initial unread count should be 1.");

    // Add another unread notification
    await createNotification({
      userId: userA.id,
      type: NotificationType.MATCH_REMINDER,
      title: "Match Reminder",
      message: "Your match is soon",
    });

    const updatedCount = await getUnreadCount(userA.id);
    assert(updatedCount === initialCount + 1, "Unread count should increment by 1.");
  });

  // -------------------------------------------------------------
  // Test 3: Marking and deleting owned notifications
  // -------------------------------------------------------------
  await test("Marking and deleting owned notifications", async () => {
    const listA = await getUserNotifications(userA.id);
    const firstNotif = listA.notifications[0];

    // Mark as read
    const marked = await markAsRead(firstNotif.id, userA.id);
    assert(marked.isRead === true, "Notification isRead should be true.");
    assert(marked.readAt !== null, "Notification readAt should be populated.");

    // Unread count should decrease
    const countAfterRead = await getUnreadCount(userA.id);
    assert(countAfterRead === 1, "Unread count should have decreased to 1.");

    // Delete notification
    const delResult = await deleteNotification(firstNotif.id, userA.id);
    assert(delResult.success === true, "Delete should return success true.");

    const listAfterDelete = await getUserNotifications(userA.id);
    assert(
      !listAfterDelete.notifications.some((n) => n.id === firstNotif.id),
      "Deleted notification should no longer appear in user list."
    );
  });

  // -------------------------------------------------------------
  // Test 4: Rejecting access to another user's notification
  // -------------------------------------------------------------
  await test("Rejecting access to another user's notification", async () => {
    const listB = await getUserNotifications(userB.id);
    const notifB = listB.notifications[0];

    // User A attempts to mark User B's notification
    let permissionDeniedMark = false;
    try {
      await markAsRead(notifB.id, userA.id);
    } catch (err: any) {
      if (err.message.includes("permission")) {
        permissionDeniedMark = true;
      }
    }
    assert(permissionDeniedMark, "User A must not be allowed to mark User B's notification as read.");

    // User A attempts to delete User B's notification
    let permissionDeniedDelete = false;
    try {
      await deleteNotification(notifB.id, userA.id);
    } catch (err: any) {
      if (err.message.includes("permission")) {
        permissionDeniedDelete = true;
      }
    }
    assert(permissionDeniedDelete, "User A must not be allowed to delete User B's notification.");
  });

  // -------------------------------------------------------------
  // Test 5: Notification generation after booking creation and cancellation
  // -------------------------------------------------------------
  await test("Notification generation after successful booking creation/cancellation", async () => {
    // Clear User A notifications
    await prisma.notification.deleteMany({ where: { userId: userA.id } });

    // 1. Create Booking
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    await prisma.payment.deleteMany({
      where: { booking: { courtId: court.id, bookingDate: { gte: startOfDay, lte: endOfDay } } },
    });
    await prisma.booking.deleteMany({
      where: { courtId: court.id, bookingDate: { gte: startOfDay, lte: endOfDay } },
    });

    const { booking } = await createBooking({
      courtId: court.id,
      bookingDate: dateStr,
      startTime: "15:00",
      duration: 2,
      userId: userA.id,
      customerName: userA.name,
      customerPhone: "0901234567",
    });

    const notifsAfterBooking = await getUserNotifications(userA.id);
    const bookingConfirmedNotif = notifsAfterBooking.notifications.find(
      (n) => n.type === NotificationType.BOOKING_CONFIRMED
    );
    assert(!!bookingConfirmedNotif, "Booking confirmed notification must be triggered.");
    assert(
      bookingConfirmedNotif!.title.includes(court.name) || bookingConfirmedNotif!.message.includes(court.name),
      "Notification should mention the court name."
    );

    // 2. Cancel Booking
    await cancelBooking(booking.id, {
      cancelledByUserId: userA.id,
      reason: "Scheduling conflict",
    });

    const notifsAfterCancel = await getUserNotifications(userA.id);
    const bookingCancelledNotif = notifsAfterCancel.notifications.find(
      (n) => n.type === NotificationType.BOOKING_CANCELLED
    );
    assert(!!bookingCancelledNotif, "Booking cancelled notification must be triggered.");
  });

  // -------------------------------------------------------------
  // Test 6: Match join/leave/cancel notification triggers
  // -------------------------------------------------------------
  await test("Match join/leave/cancel notification triggers", async () => {
    // Clear notifications for test users
    await prisma.notification.deleteMany({
      where: { userId: { in: [userA.id, userB.id, userC.id] } },
    });

    const matchDate = new Date();
    matchDate.setDate(matchDate.getDate() + 4);
    const matchDateStr = matchDate.toISOString().split("T")[0];

    // User A creates open match
    const match = await createMatch({
      title: "Doubles Smash Notification Test",
      venueId: venue.id,
      date: matchDateStr,
      startTime: "18:00",
      endTime: "20:00",
      creatorId: userA.id,
      maxPlayers: 3,
    });

    // User B joins match -> User A (creator) receives MATCH_JOINED notification
    await joinMatch(match.id, userB.id);

    const notifsA = await getUserNotifications(userA.id);
    const joinNotif = notifsA.notifications.find(
      (n) => n.type === NotificationType.MATCH_JOINED
    );
    assert(!!joinNotif, "Host must receive MATCH_JOINED notification when player joins.");
    assert(joinNotif!.message.includes(userB.name), "Notification should mention player name.");

    // User B leaves match -> User A receives MATCH_LEFT notification
    await leaveMatch(match.id, userB.id);

    const notifsAAfterLeave = await getUserNotifications(userA.id);
    const leaveNotif = notifsAAfterLeave.notifications.find(
      (n) => n.type === NotificationType.MATCH_LEFT
    );
    assert(!!leaveNotif, "Host must receive MATCH_LEFT notification when player leaves.");

    // User C joins match
    await joinMatch(match.id, userC.id);

    // Host (User A) cancels match -> User C receives MATCH_CANCELLED notification
    await cancelMatch(match.id, userA.id, "Host unwell");

    const notifsC = await getUserNotifications(userC.id);
    const cancelNotif = notifsC.notifications.find(
      (n) => n.type === NotificationType.MATCH_CANCELLED
    );
    assert(!!cancelNotif, "Participant must receive MATCH_CANCELLED notification.");
    assert(cancelNotif!.message.includes("Host unwell"), "Cancel reason should be included in notification.");
  });

  // -------------------------------------------------------------
  // Test 7: No notification for a failed mutation
  // -------------------------------------------------------------
  await test("No notification for a failed mutation", async () => {
    const initialCount = await getUnreadCount(userA.id);

    // Attempting invalid booking in the past
    let failed = false;
    try {
      await createBooking({
        courtId: court.id,
        bookingDate: "2020-01-01",
        startTime: "10:00",
        duration: 1,
        userId: userA.id,
        customerName: userA.name,
        customerPhone: "0901234567",
      });
    } catch {
      failed = true;
    }

    assert(failed, "Booking creation in past date must throw error.");
    const countAfterFailure = await getUnreadCount(userA.id);
    assert(
      countAfterFailure === initialCount,
      "No notification should be generated when a mutation fails."
    );
  });

  // -------------------------------------------------------------
  // Test 8: Idempotency preventing duplicate notifications
  // -------------------------------------------------------------
  await test("Idempotency preventing duplicate notifications", async () => {
    const key = `test-idempotency-booking-12345`;

    const first = await createNotification({
      userId: userA.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: "Booking Confirmed #12345",
      message: "First creation",
      idempotencyKey: key,
    });

    const second = await createNotification({
      userId: userA.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: "Booking Confirmed #12345",
      message: "Second creation retry",
      idempotencyKey: key,
    });

    assert(first !== null && second !== null, "Both calls should succeed.");
    assert(first!.id === second!.id, "Duplicate call with same idempotency key must return original notification.");

    const countWithKey = await prisma.notification.count({
      where: { idempotencyKey: key },
    });
    assert(countWithKey === 1, "Only 1 notification record must exist in DB for the idempotency key.");
  });

  // -------------------------------------------------------------
  // Test 9: Match Invitations (Create, Duplicate, Accept, Decline, Full Match)
  // -------------------------------------------------------------
  await test("Invitation acceptance, decline, duplicate invitations, and full-match rejection", async () => {
    const matchDate = new Date();
    matchDate.setDate(matchDate.getDate() + 5);
    const dateStr = matchDate.toISOString().split("T")[0];

    // Create match with max 2 players (Host + 1 guest)
    const match = await createMatch({
      title: "Invitation Test Match",
      venueId: venue.id,
      date: dateStr,
      startTime: "19:00",
      endTime: "21:00",
      creatorId: userA.id,
      maxPlayers: 2,
    });

    // 1. Host (User A) invites User B
    const inviteB = await createMatchInvitation({
      senderId: userA.id,
      recipientId: userB.id,
      matchId: match.id,
      notes: "Join us for a friendly match!",
    });

    assert(inviteB.status === InvitationStatus.PENDING, "Invitation status should be PENDING.");

    // User B receives MATCH_INVITATION notification
    const notifsB = await getUserNotifications(userB.id);
    assert(
      notifsB.notifications.some((n) => n.type === NotificationType.MATCH_INVITATION),
      "User B should receive MATCH_INVITATION notification."
    );

    // 2. Prevent duplicate active invitation
    let dupFailed = false;
    try {
      await createMatchInvitation({
        senderId: userA.id,
        recipientId: userB.id,
        matchId: match.id,
      });
    } catch (e: any) {
      if (e.message.includes("active invitation has already been sent")) {
        dupFailed = true;
      }
    }
    assert(dupFailed, "Sending duplicate active invitation must be rejected.");

    // 3. Unauthorized user cannot respond
    let unauthorizedFailed = false;
    try {
      await respondToInvitation(inviteB.id, userC.id, "ACCEPT");
    } catch (e: any) {
      if (e.message.includes("not authorized")) {
        unauthorizedFailed = true;
      }
    }
    assert(unauthorizedFailed, "User C must not be allowed to respond to User B's invitation.");

    // 4. User B accepts invitation -> joins match
    const accepted = await respondToInvitation(inviteB.id, userB.id, "ACCEPT");
    assert(accepted.status === InvitationStatus.ACCEPTED, "Invitation status should be ACCEPTED.");

    // Check match is now FULL (2/2 players)
    const updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: { participants: { where: { status: "JOINED" } } },
    });
    assert(updatedMatch?.status === MatchStatus.FULL, "Match should now be FULL.");
    assert(updatedMatch?.participants.length === 2, "Match should have 2 joined participants.");

    // 5. Host attempts to invite User C to now-full match
    let fullInviteFailed = false;
    try {
      await createMatchInvitation({
        senderId: userA.id,
        recipientId: userC.id,
        matchId: match.id,
      });
    } catch (e: any) {
      if (e.message.includes("already full")) {
        fullInviteFailed = true;
      }
    }
    assert(fullInviteFailed, "Cannot invite players when match is already full.");

    // 6. Test Decline flow on a second match
    const match2 = await createMatch({
      title: "Decline Test Match",
      venueId: venue.id,
      date: dateStr,
      startTime: "10:00",
      endTime: "12:00",
      creatorId: userA.id,
      maxPlayers: 4,
    });

    const inviteC = await createMatchInvitation({
      senderId: userA.id,
      recipientId: userC.id,
      matchId: match2.id,
    });

    const declined = await respondToInvitation(inviteC.id, userC.id, "DECLINE");
    assert(declined.status === InvitationStatus.DECLINED, "Invitation status should be DECLINED.");
  });

  // -------------------------------------------------------------
  // Test 10: Reminder Scheduling and Duplicate Prevention
  // -------------------------------------------------------------
  await test("Reminder scheduling and duplicate prevention", async () => {
    // Clear notifications for User A
    await prisma.notification.deleteMany({ where: { userId: userA.id } });

    // Create a confirmed booking exactly 24 hours ahead
    const refTime = new Date("2026-11-01T10:00:00.000Z");
    const targetDate = new Date("2026-11-02T00:00:00.000Z"); // 24 hours later at 10:00
    const targetDateStr = "2026-11-02";

    const reminderBooking = await prisma.booking.create({
      data: {
        bookingCode: `REMIND-${Date.now()}`,
        courtId: court.id,
        userId: userA.id,
        customerName: userA.name,
        customerPhone: "0901234567",
        bookingDate: targetDate,
        startTime: "10:00",
        endTime: "12:00",
        duration: 2,
        totalPrice: 200000,
        status: BookingStatus.CONFIRMED,
      },
    });

    // Run processReminders with reference time
    const result1 = await processReminders(refTime);
    assert(result1.remindersSent > 0, "Reminders should be sent for eligible bookings.");

    const notifsAfterRemind = await getUserNotifications(userA.id);
    const remindNotif = notifsAfterRemind.notifications.find(
      (n) => n.idempotencyKey === `remind-booking-${reminderBooking.id}-24h`
    );
    assert(!!remindNotif, "24h reminder notification must be dispatched with expected idempotency key.");

    // Running processReminders again must not send duplicate reminders
    const result2 = await processReminders(refTime);
    assert(
      result2.remindersSent === 0,
      "Second reminder run should send 0 new reminders due to idempotency keys."
    );

    // Cancelled booking should be skipped
    await prisma.booking.update({
      where: { id: reminderBooking.id },
      data: { status: BookingStatus.CANCELLED },
    });

    // Cleanup idempotency key and re-run: cancelled booking must be skipped
    await prisma.notification.deleteMany({
      where: { idempotencyKey: `remind-booking-${reminderBooking.id}-24h` },
    });

    const result3 = await processReminders(refTime);
    const notifsAfterCancelRun = await getUserNotifications(userA.id);
    assert(
      !notifsAfterCancelRun.notifications.some(
        (n) => n.idempotencyKey === `remind-booking-${reminderBooking.id}-24h`
      ),
      "Cancelled booking must not receive reminder."
    );
  });

  // -------------------------------------------------------------
  // Test 11: Notification preference validation
  // -------------------------------------------------------------
  await test("Notification preference validation and suppression", async () => {
    // 1. Get default preferences
    const defaultPrefs = await getNotificationPreferences(userA.id);
    assert(defaultPrefs.bookingUpdates === true, "Default bookingUpdates should be true.");
    assert(defaultPrefs.matchUpdates === true, "Default matchUpdates should be true.");

    // 2. Disable reminders and bookingUpdates for User A
    await updateNotificationPreferences(userA.id, {
      reminders: false,
      bookingUpdates: false,
    });

    const updatedPrefs = await getNotificationPreferences(userA.id);
    assert(updatedPrefs.reminders === false, "Reminders toggle should be false.");
    assert(updatedPrefs.bookingUpdates === false, "Booking updates toggle should be false.");

    // 3. Attempt to create BOOKING_CONFIRMED notification for User A -> should be suppressed
    const suppressedBookingNotif = await createNotification({
      userId: userA.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: "Suppressed Booking",
      message: "Should not be saved",
    });
    assert(
      suppressedBookingNotif === null,
      "Notification must be suppressed when user preference is disabled."
    );

    // 4. Attempt to create MATCH_REMINDER notification for User A -> should be suppressed
    const suppressedRemindNotif = await createNotification({
      userId: userA.id,
      type: NotificationType.MATCH_REMINDER,
      title: "Suppressed Reminder",
      message: "Should not be saved",
    });
    assert(
      suppressedRemindNotif === null,
      "Reminder notification must be suppressed when user preference is disabled."
    );

    // Re-enable preferences
    await updateNotificationPreferences(userA.id, {
      reminders: true,
      bookingUpdates: true,
    });
  });

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runNotificationTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
