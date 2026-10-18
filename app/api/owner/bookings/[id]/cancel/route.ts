import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOwner } from "@/lib/auth";
import { cancelBooking } from "@/lib/booking-engine";

export async function POST(
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
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim();

    if (!reason || reason.length < 3) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Cancellation reason is required (minimum 3 characters).",
        },
        { status: 400 }
      );
    }

    // Verify booking existence and ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: { include: { venue: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && booking.court.venue.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. You do not own the venue for this booking." },
        { status: 403 }
      );
    }

    const cancelledBooking = await cancelBooking(bookingId, {
      reason,
      cancelledByUserId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Booking has been cancelled by owner and slot released.",
      booking: cancelledBooking,
    });
  } catch (error: any) {
    console.error("POST /api/owner/bookings/[id]/cancel error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel booking." },
      { status: 500 }
    );
  }
}
