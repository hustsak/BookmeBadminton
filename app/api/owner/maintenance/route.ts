import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDateString, parseBookingDateMidnight } from "@/lib/booking-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courtId, date, startTime, endTime, reason, ownerId } = body;

    if (!courtId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: "courtId, date, startTime, and endTime are required." },
        { status: 400 }
      );
    }

    const court = await prisma.court.findUnique({
      where: { id: parseInt(courtId, 10) },
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

    const normalizedDate = normalizeDateString(date);
    const dateUtc = parseBookingDateMidnight(normalizedDate);

    const block = await prisma.maintenanceBlock.create({
      data: {
        courtId: court.id,
        date: dateUtc,
        startTime,
        endTime,
        reason: reason || "Routine Maintenance",
      },
      include: {
        court: {
          include: { venue: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Maintenance block created.",
        block,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/owner/maintenance error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create maintenance block." },
      { status: 500 }
    );
  }
}
