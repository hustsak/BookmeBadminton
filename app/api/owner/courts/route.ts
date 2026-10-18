import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOwner } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { user, isForbidden } = await getAuthenticatedOwner(request);

    if (isForbidden) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. Owner or Admin privileges required." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { venueId, name, priceHour, surface } = body;

    if (!venueId || !name || priceHour === undefined) {
      return NextResponse.json(
        { success: false, message: "venueId, name, and priceHour are required." },
        { status: 400 }
      );
    }

    const parsedVenueId = parseInt(venueId, 10);
    const venue = await prisma.venue.findUnique({
      where: { id: parsedVenueId },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, message: "Venue not found." },
        { status: 404 }
      );
    }

    // Strict Ownership Enforcement: Must own venue to add court
    if (user.role !== "ADMIN" && venue.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. You do not own this venue." },
        { status: 403 }
      );
    }

    const court = await prisma.court.create({
      data: {
        venueId: parsedVenueId,
        name: name.trim(),
        priceHour: Math.max(1000, parseInt(priceHour, 10)),
        surface: (surface || "Taraflex Pro Turf").trim(),
        isActive: true,
      },
    });

    return NextResponse.json(
      { success: true, message: "Court created successfully.", court },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/owner/courts error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create court." },
      { status: 500 }
    );
  }
}
