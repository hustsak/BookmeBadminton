import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeDateString,
  parseBookingDateMidnight,
  intervalsOverlap,
  timeToMinutes,
  addHoursToTime,
} from "@/lib/booking-engine";

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

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return NextResponse.json(
        { success: false, message: "End time must be strictly after start time." },
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

    // Concurrently serialize court maintenance reservations
    const block = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${court.id}::integer, hashtext(${normalizedDate})::integer)`;

      const startOfDay = new Date(`${normalizedDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${normalizedDate}T23:59:59.999Z`);

      // Check for active player booking overlaps
      const activeBookings = await tx.booking.findMany({
        where: {
          courtId: court.id,
          bookingDate: { gte: startOfDay, lte: endOfDay },
          status: { not: "CANCELLED" },
        },
      });

      for (const b of activeBookings) {
        const bEndTime = b.endTime || addHoursToTime(b.startTime, b.duration);
        if (intervalsOverlap(startTime, endTime, b.startTime, bEndTime)) {
          throw new Error(
            `SLOT_CONFLICT: Cannot schedule maintenance; active booking ${b.bookingCode} exists during ${b.startTime} - ${bEndTime}.`
          );
        }
      }

      // Check existing maintenance blocks for overlap
      const existingBlocks = await tx.maintenanceBlock.findMany({
        where: {
          courtId: court.id,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      for (const mb of existingBlocks) {
        if (intervalsOverlap(startTime, endTime, mb.startTime, mb.endTime)) {
          throw new Error(
            `SLOT_CONFLICT: Court maintenance block already exists during ${mb.startTime} - ${mb.endTime}.`
          );
        }
      }

      return tx.maintenanceBlock.create({
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
    if (error?.message && error.message.startsWith("SLOT_CONFLICT:")) {
      return NextResponse.json(
        {
          success: false,
          code: "SLOT_CONFLICT",
          message: error.message.replace("SLOT_CONFLICT: ", ""),
        },
        { status: 409 }
      );
    }
    console.error("POST /api/owner/maintenance error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create maintenance block." },
      { status: 500 }
    );
  }
}
