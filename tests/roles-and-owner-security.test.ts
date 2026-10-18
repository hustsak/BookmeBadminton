import { prisma } from "../lib/prisma";
import { UserRole } from "@prisma/client";
import { POST as registerRoute } from "../app/api/auth/register/route";
import { POST as loginRoute } from "../app/api/auth/login/route";
import { GET as getOwnerVenuesRoute, POST as postOwnerVenuesRoute } from "../app/api/owner/venues/route";
import { PATCH as patchOwnerVenueDetailRoute } from "../app/api/owner/venues/[id]/route";
import { POST as postOwnerCourtsRoute } from "../app/api/owner/courts/route";
import { PATCH as patchOwnerCourtRoute, DELETE as deleteOwnerCourtRoute } from "../app/api/owner/courts/[id]/route";
import { GET as getOwnerBookingsRoute } from "../app/api/owner/bookings/route";
import { POST as postOwnerMaintenanceRoute } from "../app/api/owner/maintenance/route";
import { GET as getPlayerBookingsRoute, POST as postPlayerBookingRoute } from "../app/api/bookings/route";
import { getAuthenticatedOwner } from "../lib/auth";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runRoleSecurityTests() {
  console.log("===============================================================");
  console.log("🏸 BOOKMEBADMINTON: SIMPLE ROLES & OWNER SECURITY TEST SUITE 🏸");
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

  const timestamp = Date.now();
  const playerEmail = `test.player.${timestamp}@bookme.test`;
  const ownerAEmail = `test.ownerA.${timestamp}@bookme.test`;
  const ownerBEmail = `test.ownerB.${timestamp}@bookme.test`;

  let createdPlayerId: number = 0;
  let createdOwnerAId: number = 0;
  let createdOwnerBId: number = 0;
  let ownerAVenueId: number = 0;
  let ownerACourtId: number = 0;
  let ownerBVenueId: number = 0;
  let ownerBCourtId: number = 0;

  // =========================================================================
  // 1. REGISTRATION TESTS
  // =========================================================================

  await test("1.1: Registration as Player saves role CUSTOMER and creates PlayerProfile", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Player",
        email: playerEmail,
        role: "CUSTOMER",
        phone: "0912345678",
      }),
    });

    const res = await registerRoute(req);
    assert(res.status === 201, `Expected status 201, got ${res.status}`);

    const data = await res.json();
    assert(data.success === true, "Response should indicate success");
    assert(data.user.role === "CUSTOMER", `User role must be CUSTOMER, got ${data.user.role}`);
    assert(data.redirectTo === "/", `Redirect should be '/', got ${data.redirectTo}`);
    createdPlayerId = data.user.id;

    // Verify database record
    const dbUser = await prisma.user.findUnique({
      where: { id: createdPlayerId },
      include: { profile: true },
    });
    assert(dbUser !== null, "User must exist in DB");
    assert(dbUser?.role === "CUSTOMER", "DB role must be CUSTOMER");
    assert(dbUser?.profile !== null, "PlayerProfile must be automatically created");
  });

  await test("1.2: Registration as Club Owner saves role OWNER and creates initial Venue", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Owner Alpha",
        email: ownerAEmail,
        role: "OWNER",
        clubName: "Alpha Badminton Arena",
        clubAddress: "123 Xuan Thuy, Cau Giay",
      }),
    });

    const res = await registerRoute(req);
    assert(res.status === 201, `Expected status 201, got ${res.status}`);

    const data = await res.json();
    assert(data.success === true, "Response should indicate success");
    assert(data.user.role === "OWNER", `User role must be OWNER, got ${data.user.role}`);
    assert(data.redirectTo === "/owner", `Redirect should be '/owner', got ${data.redirectTo}`);
    createdOwnerAId = data.user.id;

    // Verify database record
    const dbOwner = await prisma.user.findUnique({
      where: { id: createdOwnerAId },
      include: { ownedVenues: { include: { courts: true } } },
    });
    assert(dbOwner !== null, "Owner user must exist in DB");
    assert(dbOwner?.role === "OWNER", "DB role must be OWNER");
    assert((dbOwner?.ownedVenues?.length ?? 0) === 1, "Initial club venue must be created for owner");
    assert((dbOwner?.ownedVenues[0]?.courts?.length ?? 0) >= 2, "Default courts must be created for owner venue");

    ownerAVenueId = dbOwner!.ownedVenues[0].id;
    ownerACourtId = dbOwner!.ownedVenues[0].courts[0].id;
  });

  await test("1.3: Registration for second Owner (Owner B) succeeds with isolated venue", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Owner Beta",
        email: ownerBEmail,
        role: "OWNER",
        clubName: "Beta Badminton Hub",
        clubAddress: "456 Nguyen Trai, Thanh Xuan",
      }),
    });

    const res = await registerRoute(req);
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    createdOwnerBId = data.user.id;

    const dbOwnerB = await prisma.user.findUnique({
      where: { id: createdOwnerBId },
      include: { ownedVenues: { include: { courts: true } } },
    });
    ownerBVenueId = dbOwnerB!.ownedVenues[0].id;
    ownerBCourtId = dbOwnerB!.ownedVenues[0].courts[0].id;

    assert(ownerAVenueId !== ownerBVenueId, "Owner A and Owner B must have distinct venues");
  });

  await test("1.4: Public registration attempting ADMIN role is strictly rejected (400)", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker",
        email: `hacker.${timestamp}@test.com`,
        role: "ADMIN",
      }),
    });

    const res = await registerRoute(req);
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.code === "FORBIDDEN_ROLE", "Must return FORBIDDEN_ROLE error code");

    // Verify no user was created
    const hacker = await prisma.user.findUnique({
      where: { email: `hacker.${timestamp}@test.com` },
    });
    assert(hacker === null, "Admin must NOT be created in DB");
  });

  await test("1.5: Duplicate email registration is rejected (409 Conflict)", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate User",
        email: playerEmail,
        role: "CUSTOMER",
      }),
    });

    const res = await registerRoute(req);
    assert(res.status === 409, `Expected status 409, got ${res.status}`);
  });

  // =========================================================================
  // 2. LOGIN TESTS
  // =========================================================================

  await test("2.1: Player login redirects to '/' with role CUSTOMER", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: playerEmail }),
    });

    const res = await loginRoute(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Login must succeed");
    assert(data.user.role === "CUSTOMER", "Role must be CUSTOMER");
    assert(data.redirectTo === "/", "Redirect must be '/' for Player");
  });

  await test("2.2: Owner login redirects to '/owner' with role OWNER", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ownerAEmail }),
    });

    const res = await loginRoute(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Login must succeed");
    assert(data.user.role === "OWNER", "Role must be OWNER");
    assert(data.redirectTo === "/owner", "Redirect must be '/owner' for Owner");
  });

  // =========================================================================
  // 3. ACCESS CONTROL: PLAYERS BLOCKED FROM OWNER ENDPOINTS (403)
  // =========================================================================

  await test("3.1: Player cannot call GET /api/owner/venues (403 Forbidden)", async () => {
    const req = new Request("http://localhost:3000/api/owner/venues", {
      headers: { "x-user-id": String(createdPlayerId) },
    });
    const res = await getOwnerVenuesRoute(req);
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    const data = await res.json();
    assert(data.code === "FORBIDDEN", "Must return FORBIDDEN code");
  });

  await test("3.2: Player cannot call POST /api/owner/courts (403 Forbidden)", async () => {
    const req = new Request("http://localhost:3000/api/owner/courts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdPlayerId),
      },
      body: JSON.stringify({
        venueId: ownerAVenueId,
        name: "Hacked Court",
        priceHour: 100000,
      }),
    });
    const res = await postOwnerCourtsRoute(req);
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  await test("3.3: Player cannot call GET /api/owner/bookings (403 Forbidden)", async () => {
    const req = new Request("http://localhost:3000/api/owner/bookings", {
      headers: { "x-user-id": String(createdPlayerId) },
    });
    const res = await getOwnerBookingsRoute(req);
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  await test("3.4: Player cannot call POST /api/owner/maintenance (403 Forbidden)", async () => {
    const req = new Request("http://localhost:3000/api/owner/maintenance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdPlayerId),
      },
      body: JSON.stringify({
        courtId: ownerACourtId,
        date: "2026-10-25",
        startTime: "10:00",
        endTime: "12:00",
      }),
    });
    const res = await postOwnerMaintenanceRoute(req);
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  // =========================================================================
  // 4. OWNER OPERATIONS ON THEIR OWN VENUE & COURTS
  // =========================================================================

  let newCourtIdByOwnerA: number = 0;

  await test("4.1: Owner A can list only their own venues via GET /api/owner/venues", async () => {
    const req = new Request("http://localhost:3000/api/owner/venues", {
      headers: { "x-user-id": String(createdOwnerAId) },
    });
    const res = await getOwnerVenuesRoute(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.venues), "Venues must be an array");
    assert(data.venues.length === 1, `Owner A should only see 1 venue, got ${data.venues.length}`);
    assert(data.venues[0].id === ownerAVenueId, "Venue must match Owner A's venue");
  });

  await test("4.2: Owner A can add a new court to their own venue via POST /api/owner/courts", async () => {
    const req = new Request("http://localhost:3000/api/owner/courts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdOwnerAId),
      },
      body: JSON.stringify({
        venueId: ownerAVenueId,
        name: "Court 03 Premium",
        priceHour: 150000,
        surface: "Olympic Wooden Mat",
      }),
    });
    const res = await postOwnerCourtsRoute(req);
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.court.name === "Court 03 Premium", "Court name must match");
    assert(data.court.priceHour === 150000, "Hourly price must match");
    newCourtIdByOwnerA = data.court.id;
  });

  await test("4.3: Owner A can update court price & surface via PATCH /api/owner/courts/[id]", async () => {
    const req = new Request(`http://localhost:3000/api/owner/courts/${newCourtIdByOwnerA}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdOwnerAId),
      },
      body: JSON.stringify({
        priceHour: 180000,
        surface: "BWF Certified Mat",
      }),
    });
    const res = await patchOwnerCourtRoute(req, {
      params: Promise.resolve({ id: String(newCourtIdByOwnerA) }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.court.priceHour === 180000, "Price must be updated to 180000");
  });

  await test("4.4: Owner A can update their venue profile details", async () => {
    const req = new Request(`http://localhost:3000/api/owner/venues/${ownerAVenueId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdOwnerAId),
      },
      body: JSON.stringify({
        name: "Alpha Badminton Arena Pro",
        openTime: "05:30",
        closeTime: "23:30",
        description: "Renovated high-performance courts.",
      }),
    });
    const res = await patchOwnerVenueDetailRoute(req, {
      params: Promise.resolve({ id: String(ownerAVenueId) }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.venue.name === "Alpha Badminton Arena Pro", "Venue name must be updated");
    assert(data.venue.openTime === "05:30", "Opening time must be updated");
  });

  // =========================================================================
  // 5. CROSS-OWNER ATTACK PREVENTION (STRICT ISOLATION)
  // =========================================================================

  await test("5.1: Owner B CANNOT update Owner A's venue profile (403 Forbidden)", async () => {
    const req = new Request(`http://localhost:3000/api/owner/venues/${ownerAVenueId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdOwnerBId), // Owner B attempting to edit Owner A's venue!
      },
      body: JSON.stringify({
        name: "Hacked by Owner B",
      }),
    });
    const res = await patchOwnerVenueDetailRoute(req, {
      params: Promise.resolve({ id: String(ownerAVenueId) }),
    });
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  await test("5.2: Owner B CANNOT add a court to Owner A's venue (403 Forbidden)", async () => {
    const req = new Request("http://localhost:3000/api/owner/courts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdOwnerBId), // Owner B attempting to inject court into Owner A's venue
      },
      body: JSON.stringify({
        venueId: ownerAVenueId,
        name: "Trojan Court",
        priceHour: 50000,
      }),
    });
    const res = await postOwnerCourtsRoute(req);
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  await test("5.3: Owner B CANNOT edit Owner A's court (403 Forbidden)", async () => {
    const req = new Request(`http://localhost:3000/api/owner/courts/${ownerACourtId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdOwnerBId),
      },
      body: JSON.stringify({
        priceHour: 1000,
      }),
    });
    const res = await patchOwnerCourtRoute(req, {
      params: Promise.resolve({ id: String(ownerACourtId) }),
    });
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  await test("5.4: Owner B CANNOT delete Owner A's court (403 Forbidden)", async () => {
    const req = new Request(`http://localhost:3000/api/owner/courts/${ownerACourtId}`, {
      method: "DELETE",
      headers: { "x-user-id": String(createdOwnerBId) },
    });
    const res = await deleteOwnerCourtRoute(req, {
      params: Promise.resolve({ id: String(ownerACourtId) }),
    });
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  await test("5.5: Owner B CANNOT access Owner A's venue bookings (403 Forbidden)", async () => {
    const req = new Request(`http://localhost:3000/api/owner/bookings?venueId=${ownerAVenueId}`, {
      headers: { "x-user-id": String(createdOwnerBId) },
    });
    const res = await getOwnerBookingsRoute(req);
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
  });

  await test("5.6: Tampering with ?ownerId in URL does NOT bypass server credentials", async () => {
    // Owner B passes ?ownerId=${createdOwnerAId} while having Owner B credentials
    const req = new Request(`http://localhost:3000/api/owner/venues?ownerId=${createdOwnerAId}`, {
      headers: { "x-user-id": String(createdOwnerBId) },
    });
    const res = await getOwnerVenuesRoute(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    // Must return Owner B's venue, NOT Owner A's venue!
    assert(data.venues.length === 1, "Must return only 1 venue");
    assert(data.venues[0].id === ownerBVenueId, "Must return Owner B's venue, ignoring ?ownerId tamper");
  });

  // =========================================================================
  // 6. EXISTING BOOKING FUNCTIONALITY PRESERVATION
  // =========================================================================

  let createdBookingId: number = 0;

  await test("6.1: Player can book court at Owner A's venue via POST /api/bookings", async () => {
    const req = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(createdPlayerId),
      },
      body: JSON.stringify({
        courtId: ownerACourtId,
        date: "2026-10-28",
        startTime: "18:00",
        duration: 1,
        customerName: "Test Player",
        customerEmail: playerEmail,
        customerPhone: "0912345678",
      }),
    });

    const res = await postPlayerBookingRoute(req);
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Booking must succeed");
    assert(data.booking.userId === createdPlayerId, "Booking must be associated with player");
    createdBookingId = data.booking.id;
  });

  await test("6.2: Player sees only their own booking via GET /api/bookings", async () => {
    const req = new Request("http://localhost:3000/api/bookings", {
      headers: { "x-user-id": String(createdPlayerId) },
    });
    const res = await getPlayerBookingsRoute(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.bookings), "Bookings must be array");
    const found = data.bookings.some((b: any) => b.id === createdBookingId);
    assert(found === true, "Player's created booking must be present in their history");
  });

  await test("6.3: Owner A sees this booking in their owner bookings dashboard", async () => {
    const req = new Request("http://localhost:3000/api/owner/bookings", {
      headers: { "x-user-id": String(createdOwnerAId) },
    });
    const res = await getOwnerBookingsRoute(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    const found = data.bookings.some((b: any) => b.id === createdBookingId);
    assert(found === true, "Owner A must see the booking for their court");
  });

  await test("6.4: Owner B does NOT see Owner A's booking", async () => {
    const req = new Request("http://localhost:3000/api/owner/bookings", {
      headers: { "x-user-id": String(createdOwnerBId) },
    });
    const res = await getOwnerBookingsRoute(req);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    const found = data.bookings.some((b: any) => b.id === createdBookingId);
    assert(found === false, "Owner B must NOT see Owner A's booking");
  });

  // =========================================================================
  // CLEANUP TEST DATA
  // =========================================================================
  try {
    if (createdBookingId > 0) {
      await prisma.payment.deleteMany({ where: { bookingId: createdBookingId } });
      await prisma.booking.delete({ where: { id: createdBookingId } });
    }
    if (newCourtIdByOwnerA > 0) {
      await prisma.court.delete({ where: { id: newCourtIdByOwnerA } });
    }
    if (createdPlayerId > 0) {
      await prisma.playerProfile.deleteMany({ where: { userId: createdPlayerId } });
      await prisma.user.delete({ where: { id: createdPlayerId } });
    }
    if (createdOwnerAId > 0) {
      await prisma.maintenanceBlock.deleteMany({ where: { court: { venue: { ownerId: createdOwnerAId } } } });
      await prisma.court.deleteMany({ where: { venue: { ownerId: createdOwnerAId } } });
      await prisma.venue.deleteMany({ where: { ownerId: createdOwnerAId } });
      await prisma.user.delete({ where: { id: createdOwnerAId } });
    }
    if (createdOwnerBId > 0) {
      await prisma.maintenanceBlock.deleteMany({ where: { court: { venue: { ownerId: createdOwnerBId } } } });
      await prisma.court.deleteMany({ where: { venue: { ownerId: createdOwnerBId } } });
      await prisma.venue.deleteMany({ where: { ownerId: createdOwnerBId } });
      await prisma.user.delete({ where: { id: createdOwnerBId } });
    }
  } catch (cleanErr) {
    // quiet cleanup
  }

  console.log("\n===============================================================");
  console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("===============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRoleSecurityTests().catch((e) => {
  console.error("FATAL ERROR IN TEST SUITE:", e);
  process.exit(1);
});
