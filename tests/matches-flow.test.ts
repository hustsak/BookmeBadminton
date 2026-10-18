import { prisma } from "../lib/prisma";
import {
  createMatch,
  joinMatch,
  leaveMatch,
  updateMatch,
  cancelMatch,
  getMatchById,
  listMatches,
  MatchValidationError,
  MatchNotFoundError,
  MatchAuthorizationError,
  MatchConflictError,
} from "../lib/match-engine";
import { createBooking } from "../lib/booking-engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runMatchTests() {
  console.log("=================================================");
  console.log("🏸 BOOKMEBADMINTON OPEN MATCHES & PLAYERS TESTS 🏸");
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
  const creatorUser = await prisma.user.upsert({
    where: { email: "match.creator@bookme.test" },
    update: { role: "CUSTOMER" },
    create: {
      name: "Creator User",
      email: "match.creator@bookme.test",
      role: "CUSTOMER",
    },
  });

  const player1 = await prisma.user.upsert({
    where: { email: "match.player1@bookme.test" },
    update: { role: "CUSTOMER" },
    create: {
      name: "Player One",
      email: "match.player1@bookme.test",
      role: "CUSTOMER",
    },
  });

  const player2 = await prisma.user.upsert({
    where: { email: "match.player2@bookme.test" },
    update: { role: "CUSTOMER" },
    create: {
      name: "Player Two",
      email: "match.player2@bookme.test",
      role: "CUSTOMER",
    },
  });

  const player3 = await prisma.user.upsert({
    where: { email: "match.player3@bookme.test" },
    update: { role: "CUSTOMER" },
    create: {
      name: "Player Three",
      email: "match.player3@bookme.test",
      role: "CUSTOMER",
    },
  });

  const player4 = await prisma.user.upsert({
    where: { email: "match.player4@bookme.test" },
    update: { role: "CUSTOMER" },
    create: {
      name: "Player Four",
      email: "match.player4@bookme.test",
      role: "CUSTOMER",
    },
  });

  // Venue & Court for testing
  const venue = await prisma.venue.findFirst({
    include: { courts: true },
  });
  if (!venue || venue.courts.length === 0) {
    throw new Error("No venue with courts found in database. Run db:seed or scripts/seed-data.ts first.");
  }
  const venueId = venue.id;
  const courtId = venue.courts[0].id;

  // Clean test matches
  await prisma.matchParticipant.deleteMany({
    where: {
      match: {
        creatorId: { in: [creatorUser.id, player1.id, player2.id] },
      },
    },
  });
  await prisma.match.deleteMany({
    where: {
      creatorId: { in: [creatorUser.id, player1.id, player2.id] },
    },
  });

  const futureDate = "2026-12-10";
  const futureDate2 = "2026-12-11";

  // -------------------------------------------------------------
  // TEST 1: Creating a valid match
  // -------------------------------------------------------------
  let match1Id = 0;
  await test("1. Creating a valid match with automatic creator host participation", async () => {
    const match = await createMatch({
      creatorId: creatorUser.id,
      venueId,
      courtId,
      title: "Friendly Friday Doubles",
      date: futureDate,
      startTime: "18:00",
      endTime: "20:00",
      skillLevel: "Intermediate",
      maxPlayers: 4,
      format: "Doubles",
      feePerPerson: 50000,
      description: "Casual games, shuttles included.",
    });

    assert(match.id > 0, "Match should have a valid ID");
    assert(match.title === "Friendly Friday Doubles", "Title should match");
    assert(match.status === "OPEN", "Initial match status should be OPEN");
    assert(match.currentPlayers === 1, "Creator should be counted as initial player");
    assert(match.remainingSpots === 3, "Remaining spots should be maxPlayers - 1 = 3");
    assert(match.participants.length === 1, "Participants should include creator");
    assert(match.participants[0].userId === creatorUser.id, "Participant should be creator");
    assert(match.participants[0].role === "HOST", "Creator role should be HOST");

    match1Id = match.id;
  });

  // -------------------------------------------------------------
  // TEST 2: Rejecting invalid dates and player limits
  // -------------------------------------------------------------
  await test("2. Rejecting invalid dates and player limits", async () => {
    // Past date rejection
    let pastDateRejected = false;
    try {
      await createMatch({
        creatorId: creatorUser.id,
        venueId,
        title: "Past Date Match",
        date: "2020-01-01",
        startTime: "10:00",
        maxPlayers: 4,
      });
    } catch (err: any) {
      if (err instanceof MatchValidationError) {
        pastDateRejected = true;
      }
    }
    assert(pastDateRejected, "Past date should be rejected with MatchValidationError");

    // Player limit < 2 rejection
    let invalidMinPlayers = false;
    try {
      await createMatch({
        creatorId: creatorUser.id,
        venueId,
        title: "Solo Match",
        date: futureDate,
        startTime: "10:00",
        maxPlayers: 1,
      });
    } catch (err: any) {
      if (err instanceof MatchValidationError) {
        invalidMinPlayers = true;
      }
    }
    assert(invalidMinPlayers, "Max players < 2 must be rejected");

    // Player limit > 16 rejection
    let invalidMaxPlayers = false;
    try {
      await createMatch({
        creatorId: creatorUser.id,
        venueId,
        title: "Massive Tournament Match",
        date: futureDate,
        startTime: "10:00",
        maxPlayers: 50,
      });
    } catch (err: any) {
      if (err instanceof MatchValidationError) {
        invalidMaxPlayers = true;
      }
    }
    assert(invalidMaxPlayers, "Max players > 16 must be rejected");
  });

  // -------------------------------------------------------------
  // TEST 3: Joining an open match
  // -------------------------------------------------------------
  await test("3. Joining an open match updates spots and participants", async () => {
    const updated = await joinMatch(match1Id, player1.id);

    assert(updated.currentPlayers === 2, "Expected 2 players after Player 1 joins");
    assert(updated.remainingSpots === 2, "Expected 2 spots remaining (4 - 2)");
    assert(updated.status === "OPEN", "Status should still be OPEN");
    const p1 = updated.participants.find((p: any) => p.userId === player1.id);
    assert(!!p1, "Player 1 should be in participants list");
    assert(p1.role === "PLAYER", "Player 1 role should be PLAYER");
    assert(p1.status === "JOINED", "Player 1 status should be JOINED");
  });

  // -------------------------------------------------------------
  // TEST 4: Preventing duplicate joins (and creator double join)
  // -------------------------------------------------------------
  await test("4. Preventing duplicate joins (players and creator)", async () => {
    // Player 1 tries to join again
    let duplicateRejected = false;
    try {
      await joinMatch(match1Id, player1.id);
    } catch (err: any) {
      if (err instanceof MatchConflictError) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, "Duplicate join by same player must be rejected");

    // Creator tries to join again
    let creatorDuplicateRejected = false;
    try {
      await joinMatch(match1Id, creatorUser.id);
    } catch (err: any) {
      if (err instanceof MatchConflictError) {
        creatorDuplicateRejected = true;
      }
    }
    assert(creatorDuplicateRejected, "Duplicate join by creator must be rejected");
  });

  // -------------------------------------------------------------
  // TEST 5: Status transitions to FULL when limit reached & reject overcapacity
  // -------------------------------------------------------------
  await test("5. Status transitions to FULL when limit is reached", async () => {
    // Join Player 2 -> 3 players
    const matchWithP2 = await joinMatch(match1Id, player2.id);
    assert(matchWithP2.currentPlayers === 3, "Expected 3 players");
    assert(matchWithP2.status === "OPEN", "Should still be OPEN at 3/4");

    // Join Player 3 -> 4 players (capacity reached!)
    const matchWithP3 = await joinMatch(match1Id, player3.id);
    assert(matchWithP3.currentPlayers === 4, "Expected 4 players");
    assert(matchWithP3.remainingSpots === 0, "Expected 0 spots remaining");
    assert(matchWithP3.status === "FULL", "Status must transition to FULL");
    assert(matchWithP3.isFull === true, "isFull flag must be true");

    // Now Player 4 tries to join -> Must be rejected!
    let fullRejected = false;
    try {
      await joinMatch(match1Id, player4.id);
    } catch (err: any) {
      if (err instanceof MatchConflictError) {
        fullRejected = true;
      }
    }
    assert(fullRejected, "Join must be rejected when match is FULL");
  });

  // -------------------------------------------------------------
  // TEST 6: Preventing overcapacity under concurrent requests
  // -------------------------------------------------------------
  await test("6. Preventing overcapacity under concurrent race condition requests", async () => {
    // Create a 2-player match with 1 slot available
    const raceMatch = await createMatch({
      creatorId: creatorUser.id,
      venueId,
      title: "Race Condition Sparring (1 Spot Available)",
      date: futureDate2,
      startTime: "19:00",
      maxPlayers: 2, // 1 creator + 1 open spot
    });

    // Fire Player 1 and Player 2 concurrently to compete for the single remaining spot!
    const results = await Promise.allSettled([
      joinMatch(raceMatch.id, player1.id),
      joinMatch(raceMatch.id, player2.id),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const rejections = results.filter((r) => r.status === "rejected");

    assert(
      successes.length === 1,
      `Exactly 1 request should win the spot (got ${successes.length} successes)`
    );
    assert(
      rejections.length === 1,
      `Exactly 1 request should be rejected for overcapacity (got ${rejections.length} rejections)`
    );

    // Verify DB state
    const finalMatch = await getMatchById(raceMatch.id);
    assert(finalMatch.currentPlayers === 2, "Final player count must be exactly maxPlayers (2)");
    assert(finalMatch.status === "FULL", "Match status must be FULL");
  });

  // -------------------------------------------------------------
  // TEST 7: Leaving a match and reopening a spot
  // -------------------------------------------------------------
  await test("7. Leaving a match reopens the spot and sets status back to OPEN", async () => {
    // Current match1 is FULL (4/4 players: creator, player1, player2, player3).
    // Creator cannot leave their own match:
    let creatorLeaveBlocked = false;
    try {
      await leaveMatch(match1Id, creatorUser.id);
    } catch (err: any) {
      if (err instanceof MatchValidationError) {
        creatorLeaveBlocked = true;
      }
    }
    assert(creatorLeaveBlocked, "Creator must not be allowed to leave their own match");

    // Player 3 leaves match1
    const matchAfterLeave = await leaveMatch(match1Id, player3.id);
    assert(matchAfterLeave.currentPlayers === 3, "Expected player count to decrease to 3");
    assert(matchAfterLeave.remainingSpots === 1, "Expected 1 spot reopened");
    assert(matchAfterLeave.status === "OPEN", "Match status must transition back to OPEN");

    // Now Player 4 can join in the reopened spot!
    const matchRejoined = await joinMatch(match1Id, player4.id);
    assert(matchRejoined.currentPlayers === 4, "Player 4 should successfully take the reopened spot");
    assert(matchRejoined.status === "FULL", "Match should become FULL again");
  });

  // -------------------------------------------------------------
  // TEST 8: Creator-only editing and cancellation
  // -------------------------------------------------------------
  await test("8. Creator-only editing and cancellation protection", async () => {
    // Non-creator (Player 1) tries to update match
    let unauthorizedEdit = false;
    try {
      await updateMatch(match1Id, player1.id, { title: "Hacked Match" });
    } catch (err: any) {
      if (err instanceof MatchAuthorizationError) {
        unauthorizedEdit = true;
      }
    }
    assert(unauthorizedEdit, "Non-creator must be blocked from updating match");

    // Non-creator (Player 1) tries to cancel match
    let unauthorizedCancel = false;
    try {
      await cancelMatch(match1Id, player1.id, "Cancel attempt");
    } catch (err: any) {
      if (err instanceof MatchAuthorizationError) {
        unauthorizedCancel = true;
      }
    }
    assert(unauthorizedCancel, "Non-creator must be blocked from cancelling match");

    // Creator updates maxPlayers from 4 to 6 -> match becomes OPEN with 2 spots!
    const editedMatch = await updateMatch(match1Id, creatorUser.id, {
      title: "Updated Friendly Friday Doubles",
      maxPlayers: 6,
    });
    assert(editedMatch.title === "Updated Friendly Friday Doubles", "Title should be updated");
    assert(editedMatch.maxPlayers === 6, "Max players should be updated to 6");
    assert(editedMatch.remainingSpots === 2, "Should have 2 spots (6 - 4)");
    assert(editedMatch.status === "OPEN", "Status should transition to OPEN with new spots");

    // Creator cancels the match
    const cancelled = await cancelMatch(match1Id, creatorUser.id, "Heavy rain forecast");
    assert(cancelled.status === "CANCELLED", "Match status must be CANCELLED");
  });

  // -------------------------------------------------------------
  // TEST 9: Rejecting joins after cancellation or completion
  // -------------------------------------------------------------
  await test("9. Rejecting joins after match cancellation", async () => {
    let joinCancelledRejected = false;
    try {
      await joinMatch(match1Id, player3.id);
    } catch (err: any) {
      if (err instanceof MatchConflictError) {
        joinCancelledRejected = true;
      }
    }
    assert(joinCancelledRejected, "Joining a cancelled match must be rejected");
  });

  // -------------------------------------------------------------
  // TEST 10: Filtering and remaining-spot calculations
  // -------------------------------------------------------------
  await test("10. Filtering by date, venue, skill level, and available spots", async () => {
    // Create distinct test matches
    const matchA = await createMatch({
      creatorId: creatorUser.id,
      venueId,
      title: "Beginners Morning Match",
      date: futureDate,
      startTime: "08:00",
      skillLevel: "Beginner",
      maxPlayers: 4,
    });

    const matchB = await createMatch({
      creatorId: creatorUser.id,
      venueId,
      title: "Advanced Evening Sparring",
      date: futureDate,
      startTime: "20:00",
      skillLevel: "Advanced",
      maxPlayers: 2, // 1 creator + 1 open spot
    });

    // Fill matchB
    await joinMatch(matchB.id, player1.id); // matchB is now FULL

    // 1. Filter by date
    const dateFiltered = await listMatches({ date: futureDate });
    assert(dateFiltered.some((m) => m.id === matchA.id), "Should find matchA by date");

    // 2. Filter by skillLevel Beginner
    const beginnerFiltered = await listMatches({ skillLevel: "Beginner" });
    assert(beginnerFiltered.some((m) => m.id === matchA.id), "Should find matchA");
    assert(!beginnerFiltered.some((m) => m.id === matchB.id), "Should not find matchB in Beginner filter");

    // 3. Filter by available spots only
    const openSpotsOnly = await listMatches({ availableSpots: true, date: futureDate });
    assert(openSpotsOnly.some((m) => m.id === matchA.id), "matchA has spots and should be returned");
    assert(!openSpotsOnly.some((m) => m.id === matchB.id), "matchB is FULL and should NOT be returned");

    // Remaining spots check
    const fetchedA = openSpotsOnly.find((m) => m.id === matchA.id);
    assert(fetchedA?.remainingSpots === 3, "matchA should have exactly 3 remaining spots");
  });

  // -------------------------------------------------------------
  // TEST 11: Booking Integration & Consistent Cancellation
  // -------------------------------------------------------------
  await test("11. Booking integration: linking confirmed court booking and consistent cancellation", async () => {
    // 1. Create a court booking first
    const { booking } = await createBooking({
      courtId,
      bookingDate: "2026-12-15",
      startTime: "14:00",
      duration: 2,
      userId: creatorUser.id,
      customerName: "Match Creator",
      customerEmail: "match.creator@bookme.test",
    });

    assert(booking.status === "CONFIRMED", "Booking should be confirmed");

    // 2. Create match linked to this booking
    const linkedMatch = await createMatch({
      creatorId: creatorUser.id,
      venueId,
      courtId,
      bookingId: booking.id,
      title: "Linked Court Sparring Match",
      date: "2026-12-15",
      startTime: "14:00",
      endTime: "16:00",
      maxPlayers: 4,
    });

    assert(linkedMatch.bookingId === booking.id, "Match should be linked to booking");
    assert(linkedMatch.courtId === courtId, "Match should have court ID");

    // 3. Cancelling the match must consistently cancel the linked booking as well!
    await cancelMatch(linkedMatch.id, creatorUser.id, "Emergency reschedule");

    // Verify booking in database is now CANCELLED
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    assert(updatedBooking?.status === "CANCELLED", "Linked booking should be automatically CANCELLED");
  });

  console.log("\n=================================================");
  console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runMatchTests()
  .catch((e) => {
    console.error("Test runner failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
