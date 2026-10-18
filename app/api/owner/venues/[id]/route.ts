import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const venueId = parseInt(id, 10);
    const body = await request.json();

    const { ownerId, openTime, closeTime, description, address, location } = body;

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, message: "Venue not found." },
        { status: 404 }
      );
    }

    // Strict Venue Isolation: Owner must own this venue
    if (ownerId && venue.ownerId !== parseInt(ownerId, 10)) {
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
