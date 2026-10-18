import { prisma } from "../lib/prisma";
import {
  calculateSkillCompatibility,
  calculateAvailabilityCompatibility,
  calculateVenueCompatibility,
  calculateStyleCompatibility,
  calculatePlayerCompatibility,
  calculateMatchCompatibility,
  getOrCreatePlayerProfile,
  createPlayerProfile,
  updatePlayerProfile,
  DuplicateProfileError,
  getRecommendedPlayers,
  getRecommendedMatchesForPlayer,
  listPlayers,
} from "../lib/matchmaking-engine";
import {
  PlayerSkillLevel,
  PlayingStyle,
  PlayHand,
  MatchStatus,
  SkillLevel,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runMatchmakingTests() {
  console.log("=================================================");
  console.log("🏸 BOOKMEBADMINTON SMART MATCHMAKING TESTS 🏸");
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

  // Find or create test users
  const userA = await prisma.user.upsert({
    where: { email: "matchmaker.userA@test.com" },
    update: {},
    create: {
      name: "Alice Nguyen",
      email: "matchmaker.userA@test.com",
      role: "CUSTOMER",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "matchmaker.userB@test.com" },
    update: {},
    create: {
      name: "Bob Tran",
      email: "matchmaker.userB@test.com",
      role: "CUSTOMER",
    },
  });

  const userC = await prisma.user.upsert({
    where: { email: "matchmaker.userC@test.com" },
    update: {},
    create: {
      name: "Charlie Pham",
      email: "matchmaker.userC@test.com",
      role: "CUSTOMER",
    },
  });

  const incompleteUser = await prisma.user.upsert({
    where: { email: "matchmaker.incomplete@test.com" },
    update: {},
    create: {
      name: "Incomplete User",
      email: "matchmaker.incomplete@test.com",
      role: "CUSTOMER",
    },
  });

  const venue1 = await prisma.venue.findFirst();
  const venue2 = await prisma.venue.findFirst({
    where: { id: { not: venue1?.id } },
  });

  if (!venue1 || !venue2) {
    throw new Error("Venues missing from database. Run seed first.");
  }

  // Clean previous test profiles for isolation
  await prisma.playerProfile.deleteMany({
    where: {
      userId: { in: [userA.id, userB.id, userC.id, incompleteUser.id] },
    },
  });

  // -------------------------------------------------------------
  // TEST 1: Profile Creation and Editing
  // -------------------------------------------------------------
  await test("1. Profile creation and editing with preferences", async () => {
    const profileA = await getOrCreatePlayerProfile(userA.id);
    assert(profileA.userId === userA.id, "Profile must be linked to User A");
    assert(profileA.displayName === userA.name, "Default display name should match user name");

    const updatedA = await updatePlayerProfile(userA.id, {
      displayName: "Alice Pro Smash",
      skillLevel: PlayerSkillLevel.INTERMEDIATE,
      playingStyle: PlayingStyle.DOUBLES,
      playHand: PlayHand.RIGHT,
      preferredDays: ["SATURDAY", "SUNDAY"],
      preferredTimeStart: "18:00",
      preferredTimeEnd: "21:00",
      homeVenueId: venue1.id,
      preferredVenueIds: [venue1.id],
      bio: "Active doubles player focusing on aggressive front-court net play.",
      yearsExperience: 3,
      district: venue1.location,
    });

    assert(updatedA.displayName === "Alice Pro Smash", "Display name should be updated");
    assert(updatedA.skillLevel === PlayerSkillLevel.INTERMEDIATE, "Skill level should be INTERMEDIATE");
    assert(updatedA.homeVenueId === venue1.id, "Home venue should match venue1");
    assert(updatedA.yearsExperience === 3, "Years of experience should be 3");
  });

  // -------------------------------------------------------------
  // TEST 2: Required Fields and Invalid Values
  // -------------------------------------------------------------
  await test("2. Rejection of invalid profile values", async () => {
    // Too short display name
    let shortNameRejected = false;
    try {
      await updatePlayerProfile(userA.id, { displayName: "A" });
    } catch {
      shortNameRejected = true;
    }
    assert(shortNameRejected, "Display name < 2 chars must be rejected");

    // Negative years experience
    let negativeYearsRejected = false;
    try {
      await updatePlayerProfile(userA.id, { yearsExperience: -5 });
    } catch {
      negativeYearsRejected = true;
    }
    assert(negativeYearsRejected, "Negative years of experience must be rejected");

    // Non-existent venue
    let invalidVenueRejected = false;
    try {
      await updatePlayerProfile(userA.id, { homeVenueId: 999999 });
    } catch {
      invalidVenueRejected = true;
    }
    assert(invalidVenueRejected, "Non-existent venue must be rejected");
  });

  // -------------------------------------------------------------
  // TEST 3: Profile Uniqueness, Error Handling & Concurrency Safety
  // -------------------------------------------------------------
  await test("3. Profile uniqueness, error handling & concurrent race safety", async () => {
    // 3.1: Duplicate profile creation using createPlayerProfile must throw DuplicateProfileError (409)
    let duplicateCaught = false;
    try {
      await createPlayerProfile(userA.id, {
        displayName: "Duplicate Alice",
      });
    } catch (err: any) {
      if (err instanceof DuplicateProfileError && err.statusCode === 409 && err.code === "P2002") {
        duplicateCaught = true;
      }
    }
    assert(duplicateCaught, "createPlayerProfile must throw DuplicateProfileError on existing profile");

    // 3.2: Raw duplicate create with same userId must be blocked by DB unique constraint
    let rawUniqueRejected = false;
    try {
      await prisma.playerProfile.create({
        data: {
          userId: userA.id,
          displayName: "Raw Duplicate Alice",
          skillLevel: PlayerSkillLevel.BEGINNER,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        rawUniqueRejected = true;
      }
    }
    assert(rawUniqueRejected, "Database unique constraint must block duplicate profile creation");

    // 3.3: Repeated getOrCreatePlayerProfile returns existing profile safely
    const repeatA = await getOrCreatePlayerProfile(userA.id);
    assert(repeatA.userId === userA.id, "getOrCreatePlayerProfile should safely return existing profile");

    // 3.4: Concurrent creation with getOrCreatePlayerProfile produces exactly one profile
    const raceUser1 = await prisma.user.upsert({
      where: { email: "race.user1@test.com" },
      update: {},
      create: {
        name: "Race User One",
        email: "race.user1@test.com",
        role: "CUSTOMER",
      },
    });
    await prisma.playerProfile.deleteMany({ where: { userId: raceUser1.id } });

    const [raceProfileA, raceProfileB] = await Promise.all([
      getOrCreatePlayerProfile(raceUser1.id),
      getOrCreatePlayerProfile(raceUser1.id),
    ]);

    assert(raceProfileA.id === raceProfileB.id, "Concurrent getOrCreate calls must return identical profile");
    const countUser1 = await prisma.playerProfile.count({ where: { userId: raceUser1.id } });
    assert(countUser1 === 1, "Exactly 1 profile must exist after concurrent getOrCreate calls");

    // 3.5: Concurrent creation with createPlayerProfile: exactly 1 succeeds, 1 rejects with DuplicateProfileError
    const raceUser2 = await prisma.user.upsert({
      where: { email: "race.user2@test.com" },
      update: {},
      create: {
        name: "Race User Two",
        email: "race.user2@test.com",
        role: "CUSTOMER",
      },
    });
    await prisma.playerProfile.deleteMany({ where: { userId: raceUser2.id } });

    const raceResults = await Promise.allSettled([
      createPlayerProfile(raceUser2.id, { displayName: "Racer 1" }),
      createPlayerProfile(raceUser2.id, { displayName: "Racer 2" }),
    ]);

    const fulfilled = raceResults.filter((r) => r.status === "fulfilled");
    const rejected = raceResults.filter((r) => r.status === "rejected");
    assert(fulfilled.length === 1, `Exactly 1 createPlayerProfile call must succeed (got ${fulfilled.length})`);
    assert(rejected.length === 1, `Exactly 1 createPlayerProfile call must fail (got ${rejected.length})`);
    const rejectReason = (rejected[0] as PromiseRejectedResult).reason;
    assert(
      rejectReason instanceof DuplicateProfileError,
      `Rejection must be DuplicateProfileError, got ${rejectReason}`
    );
    const countUser2 = await prisma.playerProfile.count({ where: { userId: raceUser2.id } });
    assert(countUser2 === 1, "Exactly 1 profile must exist in database for raceUser2");

    // 3.6: Unexpected errors (e.g. non-existent user) are not silently converted into success
    let nonExistentUserCaught = false;
    try {
      await createPlayerProfile(999999999);
    } catch (err: any) {
      if (err.message && err.message.includes("User does not exist")) {
        nonExistentUserCaught = true;
      }
    }
    assert(nonExistentUserCaught, "Unexpected errors must not be silently swallowed");

    // Clean up test race users
    await prisma.playerProfile.deleteMany({
      where: { userId: { in: [raceUser1.id, raceUser2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [raceUser1.id, raceUser2.id] } },
    });
  });

  // -------------------------------------------------------------
  // TEST 4: Skill-Level Compatibility Algorithm
  // -------------------------------------------------------------
  await test("4. Skill-level compatibility tier evaluation", async () => {
    // Exact match: 100%
    const exact = calculateSkillCompatibility(
      PlayerSkillLevel.INTERMEDIATE,
      PlayerSkillLevel.INTERMEDIATE
    );
    assert(exact.score === 100, "Exact skill level must yield 100%");
    assert(exact.reason.includes("match"), "Reason should indicate exact match");

    // 1 level apart: 75%
    const adjacent = calculateSkillCompatibility(
      PlayerSkillLevel.INTERMEDIATE,
      PlayerSkillLevel.ADVANCED
    );
    assert(adjacent.score === 75, "Adjacent levels must yield 75%");

    // 2 levels apart: 35%
    const distant = calculateSkillCompatibility(
      PlayerSkillLevel.BEGINNER,
      PlayerSkillLevel.ADVANCED
    );
    assert(distant.score === 35, "2 levels apart must yield 35%");

    // 3 levels apart: 10%
    const polar = calculateSkillCompatibility(
      PlayerSkillLevel.BEGINNER,
      PlayerSkillLevel.PROFESSIONAL
    );
    assert(polar.score === 10, "Polar levels must yield 10%");
  });

  // -------------------------------------------------------------
  // TEST 5: Availability Overlap Algorithm
  // -------------------------------------------------------------
  await test("5. Availability overlap calculation", async () => {
    // Overlapping weekends & overlapping evening times
    const overlap = calculateAvailabilityCompatibility(
      ["SATURDAY", "SUNDAY"],
      ["SATURDAY"],
      "18:00",
      "21:00",
      "19:00",
      "22:00"
    );
    assert(overlap.score >= 80, "Matching Saturday evening should score >= 80%");
    assert(!!overlap.reason, "Should provide an explanatory reason");

    // Disjoint days
    const disjoint = calculateAvailabilityCompatibility(
      ["MONDAY", "TUESDAY"],
      ["FRIDAY", "SATURDAY"],
      "18:00",
      "21:00",
      "18:00",
      "21:00"
    );
    assert(disjoint.score < 50, "Disjoint days should score < 50%");
  });

  // -------------------------------------------------------------
  // TEST 6: Venue and Playing-Style Compatibility
  // -------------------------------------------------------------
  await test("6. Venue and playing-style compatibility", async () => {
    // Shared home venue
    const venueSame = calculateVenueCompatibility(
      { homeVenueId: 10, venueName: "Smash Arena" },
      { homeVenueId: 10, venueName: "Smash Arena" }
    );
    assert(venueSame.score === 100, "Same home venue should score 100%");
    assert(Boolean(venueSame.reason?.includes("Smash Arena")), "Reason should mention shared home venue");

    // Both Doubles style
    const styleDoubles = calculateStyleCompatibility(
      PlayingStyle.DOUBLES,
      PlayingStyle.DOUBLES
    );
    assert(styleDoubles.score === 100, "Both doubles should score 100%");

    // Singles vs Doubles
    const styleClash = calculateStyleCompatibility(
      PlayingStyle.SINGLES,
      PlayingStyle.DOUBLES
    );
    assert(styleClash.score === 25, "Singles vs Doubles should score lower");
  });

  // -------------------------------------------------------------
  // TEST 7: Weighted Compatibility Score & Ranking
  // -------------------------------------------------------------
  await test("7. Total compatibility score and ranking orders", async () => {
    // Setup Bob: highly compatible with Alice (Intermediate, Doubles, Same Venue, Weekend)
    await updatePlayerProfile(userB.id, {
      displayName: "Bob Doubles Partner",
      skillLevel: PlayerSkillLevel.INTERMEDIATE,
      playingStyle: PlayingStyle.DOUBLES,
      preferredDays: ["SATURDAY", "SUNDAY"],
      preferredTimeStart: "18:00",
      preferredTimeEnd: "21:00",
      homeVenueId: venue1.id,
      isProfileComplete: true,
    });

    // Setup Charlie: lower compatibility (Professional, Singles, Different Venue, Weekdays)
    await updatePlayerProfile(userC.id, {
      displayName: "Charlie Pro Singles",
      skillLevel: PlayerSkillLevel.PROFESSIONAL,
      playingStyle: PlayingStyle.SINGLES,
      preferredDays: ["TUESDAY", "WEDNESDAY"],
      preferredTimeStart: "06:00",
      preferredTimeEnd: "08:00",
      homeVenueId: venue2.id,
      isProfileComplete: true,
    });

    const profA = await getOrCreatePlayerProfile(userA.id);
    const profB = await getOrCreatePlayerProfile(userB.id);
    const profC = await getOrCreatePlayerProfile(userC.id);

    const scoreAB = calculatePlayerCompatibility(profA, profB);
    const scoreAC = calculatePlayerCompatibility(profA, profC);

    assert(scoreAB.score >= 85, `Bob should have high score with Alice (got ${scoreAB.score})`);
    assert(scoreAC.score <= 45, `Charlie should have low score with Alice (got ${scoreAC.score})`);
    assert(scoreAB.score > scoreAC.score, "Bob should outrank Charlie");
    assert(scoreAB.reasons.length > 0, "Reasons should be provided");
  });

  // -------------------------------------------------------------
  // TEST 8: Excluding Current User from Recommendations
  // -------------------------------------------------------------
  await test("8. Excluding the current user from their own recommendations", async () => {
    const recommendationsForAlice = await getRecommendedPlayers(userA.id);
    const includesSelf = recommendationsForAlice.some((p) => p.userId === userA.id);
    assert(!includesSelf, "Current user must be excluded from their recommendations");
  });

  // -------------------------------------------------------------
  // TEST 9: Handling Incomplete Profiles
  // -------------------------------------------------------------
  await test("9. Incomplete profiles are excluded from scored recommendations", async () => {
    // Set incompleteUser to isProfileComplete: false
    await updatePlayerProfile(incompleteUser.id, {
      displayName: "Incomplete Tester",
      isProfileComplete: false,
    });

    const recommendations = await getRecommendedPlayers(userA.id);
    const includesIncomplete = recommendations.some((p) => p.userId === incompleteUser.id);
    assert(!includesIncomplete, "Users with isProfileComplete: false must be excluded from recommendations");
  });

  // -------------------------------------------------------------
  // TEST 10: Tailored Match Recommendations
  // -------------------------------------------------------------
  await test("10. Match recommendations matching player's tier and venue", async () => {
    // Create an open match matching Alice's venue and Intermediate level
    const match = await prisma.match.create({
      data: {
        title: "Alice Compatible Sparring",
        creatorId: userB.id,
        venueId: venue1.id,
        date: new Date(Date.now() + 86400000 * 5),
        startTime: "18:00",
        endTime: "20:00",
        skillLevel: SkillLevel.INTERMEDIATE,
        maxPlayers: 4,
        format: "Doubles",
        status: MatchStatus.OPEN,
        participants: {
          create: [{ userId: userB.id, role: "HOST", status: "JOINED" }],
        },
      },
    });

    const matchRecs = await getRecommendedMatchesForPlayer(userA.id);
    const foundMatch = matchRecs.find((m) => m.id === match.id);
    assert(Boolean(foundMatch), "Created match should appear in Alice's recommendations");
    assert(Boolean(foundMatch && foundMatch.compatibilityScore >= 80), "Should have high compatibility score");
    assert(Boolean(foundMatch && foundMatch.compatibilityReason), "Should provide explanation for recommendation");

    // Clean up test match
    await prisma.matchParticipant.deleteMany({ where: { matchId: match.id } });
    await prisma.match.delete({ where: { id: match.id } });
  });

  // -------------------------------------------------------------
  // TEST 11: Public API Privacy
  // -------------------------------------------------------------
  await test("11. Public API privacy: No email or phone in player listings", async () => {
    const result = await listPlayers({ limit: 10 });
    assert(Array.isArray(result.players), "Players must be an array");
    for (const p of result.players) {
      assert(p.user !== undefined, "User object should be present");
      assert((p.user as any).email === undefined, "Email must be excluded from public listings");
      assert((p.user as any).phone === undefined, "Phone must be excluded from public listings");
      assert((p.user as any).password === undefined, "Password must never be present");
    }
  });

  // -------------------------------------------------------------
  // TEST 12: Handling Missing Preferences without NaN
  // -------------------------------------------------------------
  await test("12. Missing preferences handle gracefully without producing NaN", async () => {
    const emptyProfileA = {
      skillLevel: undefined,
      preferredDays: [],
      preferredTimeStart: null,
      preferredTimeEnd: null,
      homeVenueId: null,
      preferredVenueIds: [],
      playingStyle: undefined,
    };
    const emptyProfileB = {
      skillLevel: undefined,
      preferredDays: undefined,
      preferredTimeStart: null,
      preferredTimeEnd: null,
      homeVenueId: null,
      preferredVenueIds: undefined,
      playingStyle: undefined,
    };

    const res = calculatePlayerCompatibility(emptyProfileA, emptyProfileB);
    assert(!isNaN(res.score), "Score must not be NaN");
    assert(res.score >= 0 && res.score <= 100, "Score must be bounded between 0 and 100");
    assert(!isNaN(res.breakdown.skillScore), "Skill score must not be NaN");
    assert(!isNaN(res.breakdown.availabilityScore), "Availability score must not be NaN");
    assert(!isNaN(res.breakdown.venueScore), "Venue score must not be NaN");
    assert(!isNaN(res.breakdown.styleScore), "Style score must not be NaN");
  });

  // -------------------------------------------------------------
  // TEST 13: Stable, Deterministic Ranking for Equal Scores
  // -------------------------------------------------------------
  await test("13. Deterministic ranking stability for equal compatibility scores", async () => {
    // Give userB and userC exact duplicate compatibility attributes with userA
    await updatePlayerProfile(userB.id, {
      displayName: "Twin B",
      skillLevel: PlayerSkillLevel.INTERMEDIATE,
      playingStyle: PlayingStyle.BOTH,
      homeVenueId: venue1.id,
      isProfileComplete: true,
    });
    await updatePlayerProfile(userC.id, {
      displayName: "Twin C",
      skillLevel: PlayerSkillLevel.INTERMEDIATE,
      playingStyle: PlayingStyle.BOTH,
      homeVenueId: venue1.id,
      isProfileComplete: true,
    });

    const run1 = await getRecommendedPlayers(userA.id);
    const run2 = await getRecommendedPlayers(userA.id);

    assert(run1.length >= 2, "Should have at least 2 recommendations");
    assert(run1[0].userId === run2[0].userId, "Rank 1 must be deterministic across calls");
    assert(run1[1].userId === run2[1].userId, "Rank 2 must be deterministic across calls");
  });

  // -------------------------------------------------------------
  // TEST 14: Match Recommendations Exclude Full or Cancelled Matches
  // -------------------------------------------------------------
  await test("14. Match recommendations exclude FULL and CANCELLED matches", async () => {
    // 1. Create a FULL match
    const fullMatch = await prisma.match.create({
      data: {
        title: "Full Match Test",
        creatorId: userB.id,
        venueId: venue1.id,
        date: new Date(Date.now() + 86400000 * 3),
        startTime: "18:00",
        endTime: "20:00",
        skillLevel: SkillLevel.ALL_LEVELS,
        maxPlayers: 2,
        status: MatchStatus.FULL,
        participants: {
          create: [
            { userId: userB.id, role: "HOST", status: "JOINED" },
            { userId: userC.id, role: "PLAYER", status: "JOINED" },
          ],
        },
      },
    });

    // 2. Create a CANCELLED match
    const cancelledMatch = await prisma.match.create({
      data: {
        title: "Cancelled Match Test",
        creatorId: userB.id,
        venueId: venue1.id,
        date: new Date(Date.now() + 86400000 * 4),
        startTime: "18:00",
        endTime: "20:00",
        skillLevel: SkillLevel.ALL_LEVELS,
        maxPlayers: 4,
        status: MatchStatus.CANCELLED,
        participants: {
          create: [{ userId: userB.id, role: "HOST", status: "JOINED" }],
        },
      },
    });

    const recommendations = await getRecommendedMatchesForPlayer(userA.id);
    const includesFull = recommendations.some((m) => m.id === fullMatch.id);
    const includesCancelled = recommendations.some((m) => m.id === cancelledMatch.id);

    assert(!includesFull, "FULL matches must be excluded from recommendations");
    assert(!includesCancelled, "CANCELLED matches must be excluded from recommendations");

    // Clean up
    await prisma.matchParticipant.deleteMany({
      where: { matchId: { in: [fullMatch.id, cancelledMatch.id] } },
    });
    await prisma.match.deleteMany({
      where: { id: { in: [fullMatch.id, cancelledMatch.id] } },
    });
  });

  // -------------------------------------------------------------
  // TEST 15: Server-side Pagination in listPlayers
  // -------------------------------------------------------------
  await test("15. Server-side pagination in listPlayers returns accurate slice and metadata", async () => {
    const page1 = await listPlayers({ page: 1, limit: 2 });
    assert(page1.pagination.page === 1, "Page should be 1");
    assert(page1.pagination.limit === 2, "Limit should be 2");
    assert(page1.players.length <= 2, "Page 1 items should be <= limit");
    assert(page1.pagination.total >= 3, "Total should count all profiles");
    assert(page1.pagination.totalPages >= 2, "Total pages should be >= 2");
  });

  console.log("\n=================================================");
  console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runMatchmakingTests()
  .catch((e) => {
    console.error("Test runner failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
