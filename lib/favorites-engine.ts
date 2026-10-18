import { prisma } from "@/lib/prisma";

export class FavoriteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FavoriteValidationError";
  }
}

export class FavoriteNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FavoriteNotFoundError";
  }
}

/**
 * Formats a database venue object for frontend consumption.
 */
function formatVenue(v: any) {
  const firstCourtPrice = v.courts?.[0]?.priceHour || 100000;
  return {
    id: v.id,
    name: v.name,
    location: v.location,
    address: v.address || v.location,
    rating: v.rating || 4.8,
    reviews: v.reviewCount || 100,
    price: Math.round(firstCourtPrice / 20000), // USD converted representation used in existing UI
    priceHour: firstCourtPrice,
    courts: v.courts?.length || 1,
    image: v.imageUrl || "/court_image/c1.jpeg",
    available: v.isActive ?? true,
    tags: ["Owner Verified", "BWF Certified Mat", "Air Conditioned"],
    description: v.description || "Premium badminton venue with professional courts.",
    contactPhone: "0912 345 678",
    contactEmail: v.owner?.email || "contact@badminton.vn",
    openingHours: `${v.openTime || "06:00"} - ${v.closeTime || "23:00"}`,
    ownerName: v.owner?.name || "Venue Management",
    ownerId: v.ownerId,
    courtsList: v.courts?.map((c: any) => ({
      id: c.id,
      name: c.name,
      priceHour: c.priceHour,
      image: v.imageUrl || "/court_image/c1.jpeg",
      surface: c.surface || "Taraflex Pro Turf",
    })) || [],
  };
}

/**
 * Get all favorited venues for a specific user, derived directly from PostgreSQL.
 */
export async function getUserFavorites(userId: number) {
  if (!userId || typeof userId !== "number" || isNaN(userId)) {
    throw new FavoriteValidationError("A valid numeric user ID is required.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new FavoriteNotFoundError(`User #${userId} does not exist.`);
  }

  const favoriteRecords = await prisma.userFavorite.findMany({
    where: { userId },
    include: {
      venue: {
        include: {
          courts: {
            where: { isActive: true },
            orderBy: { id: "asc" },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const venueIds = favoriteRecords.map((fav) => fav.venueId);
  const venues = favoriteRecords.map((fav) => formatVenue(fav.venue));

  return {
    count: favoriteRecords.length,
    venueIds,
    favorites: venues,
  };
}

/**
 * Get the exact count of favorited venues for a user from PostgreSQL.
 */
export async function getUserFavoriteCount(userId: number): Promise<number> {
  if (!userId || isNaN(userId)) return 0;
  return await prisma.userFavorite.count({
    where: { userId },
  });
}

/**
 * Toggle a favorite for a user atomically with PostgreSQL.
 */
export async function toggleUserFavorite(userId: number, venueId: number) {
  if (!userId || isNaN(userId)) {
    throw new FavoriteValidationError("Valid numeric user ID is required.");
  }
  if (!venueId || isNaN(venueId)) {
    throw new FavoriteValidationError("Valid numeric venue ID is required.");
  }

  // Verify venue exists
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, name: true },
  });

  if (!venue) {
    throw new FavoriteNotFoundError(`Venue #${venueId} does not exist.`);
  }

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.userFavorite.findUnique({
      where: {
        userId_venueId: {
          userId,
          venueId,
        },
      },
    });

    let isFavorite: boolean;

    if (existing) {
      await tx.userFavorite.delete({
        where: { id: existing.id },
      });
      isFavorite = false;
    } else {
      try {
        await tx.userFavorite.create({
          data: {
            userId,
            venueId,
          },
        });
        isFavorite = true;
      } catch (err: any) {
        // Handle concurrent insert idempotency
        if (err.code === "P2002") {
          isFavorite = true;
        } else {
          throw err;
        }
      }
    }

    const count = await tx.userFavorite.count({
      where: { userId },
    });

    return {
      isFavorite,
      count,
      venueId,
      venueName: venue.name,
    };
  });
}

/**
 * Remove a specific venue from favorites safely.
 */
export async function removeUserFavorite(userId: number, venueId: number) {
  if (!userId || isNaN(userId)) {
    throw new FavoriteValidationError("Valid numeric user ID is required.");
  }
  if (!venueId || isNaN(venueId)) {
    throw new FavoriteValidationError("Valid numeric venue ID is required.");
  }

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.userFavorite.findUnique({
      where: {
        userId_venueId: {
          userId,
          venueId,
        },
      },
    });

    if (existing) {
      await tx.userFavorite.delete({
        where: { id: existing.id },
      });
    }

    const count = await tx.userFavorite.count({
      where: { userId },
    });

    return {
      isFavorite: false,
      count,
      venueId,
    };
  });
}
