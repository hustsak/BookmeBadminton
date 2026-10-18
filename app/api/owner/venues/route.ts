import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOwner } from "@/lib/auth";

export async function GET(request: Request) {
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
        { success: false, code: "UNAUTHORIZED", message: "Authentication required. Please log in as an owner." },
        { status: 401 }
      );
    }

    // Scoped strictly to authenticated owner (or all if ADMIN)
    const venues = await prisma.venue.findMany({
      where: user.role === "ADMIN" ? {} : { ownerId: user.id },
      include: {
        courts: {
          include: {
            maintenanceBlocks: {
              orderBy: { date: "desc" },
            },
          },
          orderBy: { name: "asc" },
        },
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      ownerId: user.id,
      venues,
    });
  } catch (error: any) {
    console.error("GET /api/owner/venues error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch owner venues." },
      { status: 500 }
    );
  }
}

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
    const { name, location, address, description, openTime, closeTime } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Club / Venue name is required." },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.create({
      data: {
        name: name.trim(),
        location: (location || address || "Hanoi").trim(),
        address: address ? address.trim() : (location || "Hanoi").trim(),
        description: description ? description.trim() : "Badminton club offering courts for booking.",
        openTime: openTime || "06:00",
        closeTime: closeTime || "23:00",
        ownerId: user.id,
        courts: {
          create: [
            { name: "Court 01", priceHour: 100000, surface: "Taraflex Pro Turf" },
            { name: "Court 02", priceHour: 100000, surface: "Taraflex Pro Turf" },
          ],
        },
      },
      include: {
        courts: true,
      },
    });

    return NextResponse.json(
      { success: true, message: "Venue created successfully.", venue },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/owner/venues error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create venue." },
      { status: 500 }
    );
  }
}

