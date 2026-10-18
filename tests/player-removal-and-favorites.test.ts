import { prisma } from "../lib/prisma";
import {
  createMatch,
  joinMatch,
  removeParticipantFromMatch,
  leaveMatch,
  MatchValidationError,
  MatchNotFoundError,
  MatchAuthorizationError,
} from "../lib/match-engine";
import {
  getUserFavorites,
  getUserFavoriteCount,
  toggleUserFavorite,
  removeUserFavorite,
} from "../lib/favorites-engine";
import { POST as removePlayerRoute } from "../app/api/matches/[id]/remove-player/route";
import { GET as getFavoritesRoute, POST as postFavoritesRoute } from "../app/api/favorites/route";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("===============================================================");
  console.log("🏸 BOOKMEBADMINTON PLAYER REMOVAL & FAVORITES INTEGRATION TESTS 🏸");
  console.log("===============================================================\n");

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

  // Setup Test Users
  const hostUser = await prisma.user.upsert({
    where: { email: "host.removal.test@bookme.test" },
    update: { name: "Host Organizer", role: "CUSTOMER" },
    create: {
      name: "Host Organizer",
      email: "host.removal.test@bookme.test",
      role: "CUSTOMER",
    },
  });

  const playerA = await prisma.user.upsert({
    where: { email: "playera.removal.test@bookme.test" },
    update: { name: "Player Alpha", role: "CUSTOMER" },
    create: {
      name: "Player Alpha",
      email: "playera.removal.test@bookme.test",
      role: "CUSTOMER",
    },
  });

  const playerB = await prisma.user.upsert({
    where: { email: "playerb.removal.test@bookme.test" },
    update: { name: "Player Beta", role: "CUSTOMER" },
    create: {
      name: "Player Beta",
      email: "playerb.removal.test@bookme.test",
      role: "CUSTOMER",
    },
  });

  const unauthorizedUser = await prisma.user.upsert({
    where: { email: "unauthorized.removal.test@bookme.test" },
    update: { name: "Random User", role: "CUSTOMER" },
    create: {
      name: "Random User",
      email: "unauthorized.removal.test@bookme.test",
      role: "CUSTOMER",
    },
  });

  // Ensure player profiles exist
  await prisma.playerProfile.upsert({
    where: { userId: playerA.id },
    update: { displayName: "Player Alpha" },
    create: {
      userId: playerA.id,
      displayName: "Player Alpha",
      skillLevel: "INTERMEDIATE",
    },
  });

  // Fetch real venues
  const venues = await prisma.venue.findMany({
    include: { courts: true },
    take: 2,
  });
  if (venues.length < 2) {
    throw new Error("At least 2 venues are required in DB. Ensure seed has run.");
  }
  const venue1 = venues[0];
  const venue2 = venues[1];

  // Clean previous test data
  await prisma.userFavorite.deleteMany({
    where: {
      userId: { in: [hostUser.id, playerA.id, playerB.id, unauthorizedUser.id] },
    },
  });

  await prisma.matchParticipant.deleteMany({
    where: {
      match: {
        creatorId: { in: [hostUser.id, unauthorizedUser.id] },
      },
    },
  });

  await prisma.match.deleteMany({
    where: {
      creatorId: { in: [hostUser.id, unauthorizedUser.id] },
    },
  });

  // =========================================================================
  // SECTION 1: PLAYER REMOVAL TESTS
  // =========================================================================

  let testMatchId: number = 0;

  await test("Create match with capacity 2 and join Player A to make it FULL", async () => {
    const match = await createMatch({
      title: "Roster Removal Championship",
      creatorId: hostUser.id,
      venueId: venue1.id,
      date: "2026-12-15",
      startTime: "18:00",
      endTime: "20:00",
      maxPlayers: 2, // Host + 1 player = FULL
      skillLevel: "INTERMEDIATE",
    });

    testMatchId = match.id;
    assert(match.status === "OPEN", "Match should initially be OPEN");
    assert(match.currentPlayers === 1, "Only host is in match initially");

    // Player A joins
    const joined = await joinMatch(testMatchId, playerA.id);
    assert(joined.currentPlayers === 2, "Current players should be 2");
    assert(joined.status === "FULL", "Match should transition to FULL when limit reached");
    assert(joined.remainingSpots === 0, "Remaining spots should be 0");
  });

  await test("Unauthorized user cannot remove participants (permission check)", async () => {
    try {
      await removeParticipantFromMatch(testMatchId, unauthorizedUser.id, playerA.id);
      throw new Error("Should have thrown MatchAuthorizationError");
    } catch (err: any) {
      assert(
        err instanceof MatchAuthorizationError,
        `Expected MatchAuthorizationError, got ${err.constructor.name}: ${err.message}`
      );
    }

    // Verify Player A is still JOINED in database
    const participant = await prisma.matchParticipant.findUnique({
      where: {
        matchId_userId: { matchId: testMatchId, userId: playerA.id },
      },
    });
    assert(participant?.status === "JOINED", "Player A must still be JOINED");
  });

  await test("Host cannot remove themselves from participant list (must cancel match)", async () => {
    try {
      await removeParticipantFromMatch(testMatchId, hostUser.id, hostUser.id);
      throw new Error("Should have thrown MatchValidationError");
    } catch (err: any) {
      assert(
        err instanceof MatchValidationError,
        `Expected MatchValidationError for host self-removal, got: ${err.message}`
      );
    }
  });

  await test("Authorized host removal succeeds, reopens spot, transitions status FULL -> OPEN", async () => {
    const updated = await removeParticipantFromMatch(
      testMatchId,
      hostUser.id,
      playerA.id,
      "Cannot attend due to schedule conflict"
    );

    assert(updated.currentPlayers === 1, "Participant count must decrease from 2 to 1");
    assert(updated.remainingSpots === 1, "Remaining spots must increase from 0 to 1");
    assert(updated.status === "OPEN", "Match status must transition from FULL back to OPEN");

    // Verify in database
    const dbParticipant = await prisma.matchParticipant.findUnique({
      where: {
        matchId_userId: { matchId: testMatchId, userId: playerA.id },
      },
    });
    assert(dbParticipant?.status === "LEFT", "DB status must be LEFT");

    const activeDbCount = await prisma.matchParticipant.count({
      where: { matchId: testMatchId, status: "JOINED" },
    });
    assert(activeDbCount === 1, "Active joined DB participants must be 1 (host only)");
  });

  await test("Player account and PlayerProfile remain completely intact after removal", async () => {
    const userInDb = await prisma.user.findUnique({
      where: { id: playerA.id },
    });
    assert(userInDb !== null, "User account must NOT be deleted");

    const profileInDb = await prisma.playerProfile.findUnique({
      where: { userId: playerA.id },
    });
    assert(profileInDb !== null, "PlayerProfile must NOT be deleted");
    assert(profileInDb?.displayName === "Player Alpha", "Display name preserved");
  });

  await test("Duplicate removal requests are handled safely and idempotently", async () => {
    // Attempting to remove already-removed Player A should succeed gracefully
    const res = await removeParticipantFromMatch(testMatchId, hostUser.id, playerA.id);
    assert(res.currentPlayers === 1, "Participant count remains consistent");
    assert(res.status === "OPEN", "Match status remains OPEN");
  });

  await test("Multiple players in match: removing one player does not affect other participants", async () => {
    // Create match with max 4 players
    const match4 = await createMatch({
      title: "Four Player Isolation Test",
      creatorId: hostUser.id,
      venueId: venue1.id,
      date: "2026-12-16",
      startTime: "19:00",
      endTime: "21:00",
      maxPlayers: 4,
      skillLevel: "ALL_LEVELS",
    });

    // Join Player A and Player B
    await joinMatch(match4.id, playerA.id);
    await joinMatch(match4.id, playerB.id);

    // Remove Player A
    await removeParticipantFromMatch(match4.id, hostUser.id, playerA.id);

    // Verify Player B is still actively JOINED
    const playerBParticipant = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: match4.id, userId: playerB.id } },
    });
    assert(playerBParticipant?.status === "JOINED", "Player B must remain actively JOINED");

    // Verify Host is still actively HOST
    const hostParticipant = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: match4.id, userId: hostUser.id } },
    });
    assert(hostParticipant?.status === "JOINED", "Host must remain actively JOINED");

    // Clean up
    await prisma.matchParticipant.deleteMany({ where: { matchId: match4.id } });
    await prisma.match.delete({ where: { id: match4.id } });
  });

  await test("API Route POST /api/matches/[id]/remove-player handles authorization and response", async () => {
    // Create fresh match and add Player B
    const match = await createMatch({
      title: "API Route Removal Test",
      creatorId: hostUser.id,
      venueId: venue1.id,
      date: "2026-12-17",
      startTime: "14:00",
      endTime: "16:00",
      maxPlayers: 3,
    });
    await joinMatch(match.id, playerB.id);

    // 1. Unauthorized request
    const unauthorizedReq = new Request("http://localhost/api/matches/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(unauthorizedUser.id),
      },
      body: JSON.stringify({ userId: unauthorizedUser.id, targetUserId: playerB.id }),
    });
    const unauthRes = await removePlayerRoute(unauthorizedReq, {
      params: Promise.resolve({ id: String(match.id) }),
    });
    assert(unauthRes.status === 403, `Expected status 403 FORBIDDEN, got ${unauthRes.status}`);

    // 2. Authorized Host request
    const authReq = new Request("http://localhost/api/matches/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(hostUser.id),
      },
      body: JSON.stringify({
        userId: hostUser.id,
        targetUserId: playerB.id,
        reason: "Injured player replacement",
      }),
    });
    const authRes = await removePlayerRoute(authReq, {
      params: Promise.resolve({ id: String(match.id) }),
    });
    assert(authRes.status === 200, `Expected status 200, got ${authRes.status}`);
    const data = await authRes.json();
    assert(data.success === true, "Response must indicate success");
    assert(data.match.currentPlayers === 1, "Roster count should reflect removal");

    // Clean up
    await prisma.matchParticipant.deleteMany({ where: { matchId: match.id } });
    await prisma.match.delete({ where: { id: match.id } });
  });

  // =========================================================================
  // SECTION 2: FAVORITES TESTS
  // =========================================================================

  await test("Zero favorites: getUserFavorites returns exact count 0 and empty array", async () => {
    const data = await getUserFavorites(playerA.id);
    assert(data.count === 0, `Count must be 0, got ${data.count}`);
    assert(data.venueIds.length === 0, "Venue IDs must be empty");
    assert(data.favorites.length === 0, "Favorites list must be empty");

    const directCount = await getUserFavoriteCount(playerA.id);
    assert(directCount === 0, `Direct DB count must be 0, got ${directCount}`);
  });

  await test("Adding a favorite persists in PostgreSQL database", async () => {
    const result = await toggleUserFavorite(playerA.id, venue1.id);
    assert(result.isFavorite === true, "Result must indicate isFavorite: true");
    assert(result.count === 1, `Result count must be 1, got ${result.count}`);

    // Verify row directly in PostgreSQL
    const dbRecord = await prisma.userFavorite.findUnique({
      where: {
        userId_venueId: { userId: playerA.id, venueId: venue1.id },
      },
    });
    assert(dbRecord !== null, "UserFavorite row must exist in database");
    assert(dbRecord?.userId === playerA.id, "Record must belong to Player A");
    assert(dbRecord?.venueId === venue1.id, "Record must reference venue1");
  });

  await test("Adding second favorite: count reflects 2 and matches actual list", async () => {
    const result = await toggleUserFavorite(playerA.id, venue2.id);
    assert(result.isFavorite === true, "Second venue is favorited");
    assert(result.count === 2, `Count must be 2, got ${result.count}`);

    const data = await getUserFavorites(playerA.id);
    assert(data.count === 2, `Data count must be 2, got ${data.count}`);
    assert(data.venueIds.includes(venue1.id), "Venue 1 must be in IDs");
    assert(data.venueIds.includes(venue2.id), "Venue 2 must be in IDs");
    assert(data.favorites.length === 2, "List length must be 2");
    assert(data.favorites[0].name !== undefined, "Favorite object must have venue details");
  });

  await test("Duplicate favorites are prevented by unique constraint @@unique([userId, venueId])", async () => {
    // Attempt raw direct insert of duplicate
    try {
      await prisma.userFavorite.create({
        data: { userId: playerA.id, venueId: venue1.id },
      });
      throw new Error("Duplicate creation should have failed due to unique constraint");
    } catch (err: any) {
      assert(
        err.code === "P2002" || err.message.includes("Unique constraint"),
        `Expected P2002 unique constraint violation, got: ${err.message}`
      );
    }

    const count = await getUserFavoriteCount(playerA.id);
    assert(count === 2, "Count remains 2 without duplication");
  });

  await test("Removing a favorite persists in PostgreSQL and count immediately updates to 1", async () => {
    const result = await toggleUserFavorite(playerA.id, venue1.id);
    assert(result.isFavorite === false, "Result must indicate isFavorite: false");
    assert(result.count === 1, `Count must decrease to 1, got ${result.count}`);

    // Verify deleted in DB
    const dbRecord = await prisma.userFavorite.findUnique({
      where: {
        userId_venueId: { userId: playerA.id, venueId: venue1.id },
      },
    });
    assert(dbRecord === null, "UserFavorite row must be deleted from PostgreSQL");

    const data = await getUserFavorites(playerA.id);
    assert(data.count === 1, "Count must be 1");
    assert(!data.venueIds.includes(venue1.id), "Venue 1 removed from IDs");
    assert(data.venueIds.includes(venue2.id), "Venue 2 remains in IDs");
  });

  await test("Removing final favorite updates count to 0", async () => {
    const result = await removeUserFavorite(playerA.id, venue2.id);
    assert(result.isFavorite === false, "isFavorite is false");
    assert(result.count === 0, `Count must reach 0, got ${result.count}`);

    const directCount = await getUserFavoriteCount(playerA.id);
    assert(directCount === 0, "Database count is strictly 0");
  });

  await test("Auth Scoping: User cannot see or alter another user's favorites", async () => {
    // Player A saves venue1
    await toggleUserFavorite(playerA.id, venue1.id);

    // Player B currently has 0 favorites
    const playerBData = await getUserFavorites(playerB.id);
    assert(playerBData.count === 0, "Player B must see 0 favorites");
    assert(!playerBData.venueIds.includes(venue1.id), "Player B does not see Player A's favorite");

    // Clean up
    await removeUserFavorite(playerA.id, venue1.id);
  });

  await test("API Route GET /api/favorites scopes to authenticated user", async () => {
    // Setup 1 favorite for Player B
    await toggleUserFavorite(playerB.id, venue1.id);

    // 1. Unauthenticated request: returns 401 with count 0
    const unauthReq = new Request("http://localhost/api/favorites");
    const unauthRes = await getFavoritesRoute(unauthReq);
    assert(unauthRes.status === 401, `Unauthenticated request should return 401, got ${unauthRes.status}`);
    const unauthData = await unauthRes.json();
    assert(unauthData.count === 0, "Count is 0 for unauthenticated");

    // 2. Authenticated request for Player B: returns count 1
    const authReq = new Request("http://localhost/api/favorites", {
      headers: { "x-user-id": String(playerB.id) },
    });
    const authRes = await getFavoritesRoute(authReq);
    assert(authRes.status === 200, `Expected 200, got ${authRes.status}`);
    const authData = await authRes.json();
    assert(authData.success === true, "Must succeed");
    assert(authData.count === 1, `Count must be 1, got ${authData.count}`);
    assert(authData.venueIds.includes(venue1.id), "Must contain venue1 ID");

    // Clean up
    await removeUserFavorite(playerB.id, venue1.id);
  });

  await test("API Route POST /api/favorites toggles favorite securely", async () => {
    const postReq = new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(playerB.id),
      },
      body: JSON.stringify({
        userId: playerB.id,
        venueId: venue2.id,
      }),
    });

    const postRes = await postFavoritesRoute(postReq);
    assert(postRes.status === 200, `Expected 200, got ${postRes.status}`);
    const postData = await postRes.json();
    assert(postData.success === true, "Must be success");
    assert(postData.isFavorite === true, "Should be favorited");
    assert(postData.count === 1, "Count should be 1");

    // Toggle off via POST
    const toggleOffReq = new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(playerB.id),
      },
      body: JSON.stringify({
        userId: playerB.id,
        venueId: venue2.id,
      }),
    });
    const toggleOffRes = await postFavoritesRoute(toggleOffReq);
    const toggleOffData = await toggleOffRes.json();
    assert(toggleOffData.isFavorite === false, "Should be unfavorited");
    assert(toggleOffData.count === 0, "Count should be 0");
  });

  await test("Rapid repeated toggles do not corrupt database counts or integrity", async () => {
    // 6 rapid sequential/concurrent operations
    const promises = [
      toggleUserFavorite(playerA.id, venue1.id),
      toggleUserFavorite(playerA.id, venue2.id),
    ];
    await Promise.all(promises);

    const midCount = await getUserFavoriteCount(playerA.id);
    assert(midCount === 2, `After adding 2 distinct favorites, count must be 2, got ${midCount}`);

    // Remove both
    await Promise.all([
      removeUserFavorite(playerA.id, venue1.id),
      removeUserFavorite(playerA.id, venue2.id),
    ]);

    const finalCount = await getUserFavoriteCount(playerA.id);
    assert(finalCount === 0, `Final count must be clean 0, got ${finalCount}`);
  });

  // Clean test match
  if (testMatchId > 0) {
    await prisma.matchParticipant.deleteMany({ where: { matchId: testMatchId } });
    await prisma.match.delete({ where: { id: testMatchId } });
  }

  console.log("\n===============================================================");
  console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("===============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("FATAL TEST SUITE ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
