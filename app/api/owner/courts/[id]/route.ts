import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const courtId = parseInt(id, 10);
    const body = await request.json();

    const { ownerId, priceHour, surface, isActive, name } = body;

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });

    if (!court) {
      return NextResponse.json(
        { success: false, message: "Court not found." },
        { status: 404 }
      );
    }

    // Strict Venue Isolation
    if (ownerId && court.venue.ownerId !== parseInt(ownerId, 10)) {
      return NextResponse.json(
        {
          success: false,
          code: "FORBIDDEN",
          message: "Access denied. You do not own this court's venue.",
        },
        { status: 403 }
      );
    }

    const updated = await prisma.court.update({
      where: { id: courtId },
      data: {
        priceHour: priceHour !== undefined ? parseInt(priceHour, 10) : undefined,
        surface: surface !== undefined ? surface : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        name: name || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Court updated successfully.",
      court: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/owner/courts/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update court." },
      { status: 500 }
    );
  }
}
