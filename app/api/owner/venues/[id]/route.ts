import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOwner } from "@/lib/auth";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
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

    const { id } = await props.params;
    const venueId = parseInt(id, 10);
    if (isNaN(venueId)) {
      return NextResponse.json(
        { success: false, message: "Invalid venue ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, openTime, closeTime, description, address, location } = body;

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, message: "Venue not found." },
        { status: 404 }
      );
    }

    // Strict Ownership Enforcement: Must own this venue or be Admin
    if (user.role !== "ADMIN" && venue.ownerId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          code: "FORBIDDEN",
          message: "Access denied. You do not own this venue.",
        },
        { status: 403 }
      );
    }

    const updated = await prisma.venue.update({
      where: { id: venueId },
      data: {
        name: name ? name.trim() : undefined,
        openTime: openTime || undefined,
        closeTime: closeTime || undefined,
        description: description !== undefined ? description : undefined,
        address: address !== undefined ? address : undefined,
        location: location || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Venue settings updated successfully.",
      venue: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/owner/venues/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update venue." },
      { status: 500 }
    );
  }
}

