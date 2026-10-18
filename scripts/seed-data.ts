import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding and syncing BookMeBadminton data...");

  // 1. Users
  const alex = await prisma.user.upsert({
    where: { email: "alex.nguyen@example.com" },
    update: { role: "CUSTOMER" },
    create: {
      name: "Alex Nguyen",
      email: "alex.nguyen@example.com",
      phone: "0912 345 678",
      role: "CUSTOMER",
    },
  });

  const demoPlayer = await prisma.user.upsert({
    where: { email: "player@bookme.test" },
    update: { role: "CUSTOMER" },
    create: {
      name: "Demo Player",
      email: "player@bookme.test",
      phone: "0987 654 321",
      role: "CUSTOMER",
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: "owner1@bookme.test" },
    update: { role: "OWNER" },
    create: {
      name: "Smash Management",
      email: "owner1@bookme.test",
      phone: "0912 345 678",
      role: "OWNER",
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: "owner2@bookme.test" },
    update: { role: "OWNER" },
    create: {
      name: "Pro Sports Center Management",
      email: "owner2@bookme.test",
      phone: "0904 555 777",
      role: "OWNER",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@bookme.test" },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      name: "Platform Administrator",
      email: "admin@bookme.test",
      phone: "0901 234 567",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Users synced:", { alexId: alex.id, demoPlayerId: demoPlayer.id, owner1Id: owner1.id, owner2Id: owner2.id, adminId: admin.id });

  // 2. Venues
  // Smash Arena (id 4 or name "Smash Arena")
  let smash = await prisma.venue.findFirst({ where: { name: "Smash Arena" } });
  if (smash) {
    await prisma.venue.update({
      where: { id: smash.id },
      data: {
        ownerId: owner1.id,
        address: "125 Nguyen Trai, Thanh Xuan, Hanoi",
        openTime: "06:00",
        closeTime: "23:00",
        imageUrl: "/court_image/c1.jpeg",
      },
    });
  }

  // Victory Club
  let victory = await prisma.venue.findFirst({ where: { name: { in: ["Victory Club", "Victory Badminton Club"] } } });
  if (victory) {
    await prisma.venue.update({
      where: { id: victory.id },
      data: {
        name: "Victory Badminton Club",
        ownerId: owner1.id,
        address: "88 Xuan Thuy, Cau Giay, Hanoi",
        openTime: "06:30",
        closeTime: "22:30",
        imageUrl: "/court_image/c2.jpeg",
      },
    });
  }

  // Pro Court
  let proCourt = await prisma.venue.findFirst({ where: { name: "Pro Court" } });
  if (proCourt) {
    await prisma.venue.update({
      where: { id: proCourt.id },
      data: {
        ownerId: owner2.id,
        address: "45 Chua Boc, Dong Da, Hanoi",
        openTime: "06:00",
        closeTime: "23:00",
        imageUrl: "/court_image/c3.jpeg",
      },
    });
  }

  // Green Shuttle
  let greenShuttle = await prisma.venue.findFirst({ where: { name: "Green Shuttle" } });
  if (!greenShuttle) {
    greenShuttle = await prisma.venue.create({
      data: {
        name: "Green Shuttle",
        location: "Thanh Xuan, Hanoi",
        address: "209 Khuong Trung, Thanh Xuan, Hanoi",
        description: "Cozy neighborhood badminton venue with friendly vibes, budget pricing, and clean facilities.",
        rating: 4.6,
        reviewCount: 72,
        imageUrl: "/court_image/c4.jpg",
        openTime: "07:00",
        closeTime: "22:00",
        ownerId: owner1.id,
        courts: {
          create: [
            { name: "Court 01", priceHour: 80000, surface: "Standard Green" },
            { name: "Court 02", priceHour: 80000, surface: "Standard Green" },
          ],
        },
      },
    });
  }

  // Ace Sports Center
  let aceSports = await prisma.venue.findFirst({ where: { name: "Ace Sports Center" } });
  if (!aceSports) {
    aceSports = await prisma.venue.create({
      data: {
        name: "Ace Sports Center",
        location: "Cau Giay, Hanoi",
        address: "15 Duy Tan, Cau Giay, Hanoi",
        description: "State-of-the-art sports complex featuring badminton courts, on-site stringing shop, and player cafe.",
        rating: 4.9,
        reviewCount: 156,
        imageUrl: "/court_image/c5.webp",
        openTime: "05:30",
        closeTime: "23:30",
        ownerId: owner2.id,
        courts: {
          create: [
            { name: "Court 01", priceHour: 160000, surface: "BWF Certified Mat" },
            { name: "Court 02", priceHour: 160000, surface: "BWF Certified Mat" },
          ],
        },
      },
    });
  }

  // Shuttle House
  let shuttleHouse = await prisma.venue.findFirst({ where: { name: "Shuttle House" } });
  if (!shuttleHouse) {
    shuttleHouse = await prisma.venue.create({
      data: {
        name: "Shuttle House",
        location: "Dong Da, Hanoi",
        address: "102 Truong Chinh, Dong Da, Hanoi",
        description: "Great value badminton club in central Dong Da with high ceiling, bright LED lights, and court reservation.",
        rating: 4.5,
        reviewCount: 54,
        imageUrl: "/court_image/c6.webp",
        openTime: "06:00",
        closeTime: "22:00",
        ownerId: owner2.id,
        courts: {
          create: [
            { name: "Court 01", priceHour: 100000, surface: "Standard Mat" },
            { name: "Court 02", priceHour: 100000, surface: "Standard Mat" },
          ],
        },
      },
    });
  }

  // Make sure court surfaces are populated
  const courtsWithoutSurface = await prisma.court.findMany({
    where: { surface: null },
  });
  for (const c of courtsWithoutSurface) {
    await prisma.court.update({
      where: { id: c.id },
      data: { surface: "Taraflex Pro Turf" },
    });
  }

  console.log("Venues and courts synced successfully!");

  // 3. Seed demo open matches if none exist
  const existingMatchesCount = await prisma.match.count();
  if (existingMatchesCount === 0 && smash && victory && proCourt) {
    const today = new Date();
    const date1 = new Date(today.getTime() + 86400000 * 2).toISOString().split("T")[0];
    const date2 = new Date(today.getTime() + 86400000 * 3).toISOString().split("T")[0];
    const date3 = new Date(today.getTime() + 86400000 * 4).toISOString().split("T")[0];

    const smashCourt1 = await prisma.court.findFirst({ where: { venueId: smash.id } });
    const victoryCourt1 = await prisma.court.findFirst({ where: { venueId: victory.id } });
    const proCourt1 = await prisma.court.findFirst({ where: { venueId: proCourt.id } });

    // Seed a confirmed booking for match 1
    let matchBooking = null;
    if (smashCourt1) {
      matchBooking = await prisma.booking.create({
        data: {
          bookingCode: "BK-MATCH-101",
          userId: alex.id,
          courtId: smashCourt1.id,
          bookingDate: new Date(`${date1}T12:00:00.000Z`),
          startTime: "18:00",
          endTime: "20:00",
          duration: 2,
          pricePerHour: smashCourt1.priceHour,
          totalPrice: smashCourt1.priceHour * 2,
          status: "CONFIRMED",
          paymentStatus: "PAID",
          customerName: alex.name,
          customerEmail: alex.email,
        },
      });
    }

    // Match 1: Confirmed court, 3/4 players
    const m1 = await prisma.match.create({
      data: {
        title: "Weekend Doubles Sparring (Need 1 Player!)",
        creatorId: alex.id,
        venueId: smash.id,
        courtId: smashCourt1?.id,
        bookingId: matchBooking?.id,
        date: new Date(`${date1}T12:00:00.000Z`),
        startTime: "18:00",
        endTime: "20:00",
        skillLevel: "INTERMEDIATE",
        maxPlayers: 4,
        format: "Doubles",
        feePerPerson: 50000,
        shuttlecockProvided: true,
        description: "Looking for 1 more friendly player to join our 2-hour doubles sparring. Good rallies, sportsmanship, and quality feather shuttles provided!",
        status: "OPEN",
        participants: {
          create: [
            { userId: alex.id, role: "HOST", status: "JOINED" },
            { userId: demoPlayer.id, role: "PLAYER", status: "JOINED" },
          ],
        },
      },
    });

    // Match 2: Singles Beginner sparring
    await prisma.match.create({
      data: {
        title: "Beginner / Casual Singles Sparring & Drills",
        creatorId: demoPlayer.id,
        venueId: victory.id,
        courtId: victoryCourt1?.id,
        date: new Date(`${date2}T12:00:00.000Z`),
        startTime: "19:00",
        endTime: "20:30",
        skillLevel: "BEGINNER",
        maxPlayers: 2,
        format: "Singles",
        feePerPerson: 60000,
        shuttlecockProvided: false,
        description: "Working on basic footwork, clears, and friendly singles rallies. Split court fee 50/50.",
        status: "OPEN",
        participants: {
          create: [{ userId: demoPlayer.id, role: "HOST", status: "JOINED" }],
        },
      },
    });

    // Match 3: Advanced fast-paced sparring at Pro Court
    await prisma.match.create({
      data: {
        title: "High Intensity Advanced Doubles Smash Session",
        creatorId: alex.id,
        venueId: proCourt.id,
        courtId: proCourt1?.id,
        date: new Date(`${date3}T12:00:00.000Z`),
        startTime: "20:00",
        endTime: "22:00",
        skillLevel: "ADVANCED",
        maxPlayers: 4,
        format: "Doubles",
        feePerPerson: 75000,
        shuttlecockProvided: true,
        description: "Fast-paced games for players comfortable with steep smashes, aggressive drives, and sharp net interceptions.",
        status: "OPEN",
        participants: {
          create: [{ userId: alex.id, role: "HOST", status: "JOINED" }],
        },
      },
    });

    console.log("Seeded demo matches successfully!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
