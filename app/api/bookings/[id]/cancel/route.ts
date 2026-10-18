import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { cancelBooking, NotFoundError, ValidationError, AuthorizationError } from "@/lib/booking-engine";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking ID." },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { court: { include: { venue: true } } },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const { reason, userId } = body;
    const authUser = await getAuthenticatedUser(request, userId ? parseInt(userId, 10) : undefined);

    // If booking is registered to a user, enforce ownership or elevated role
    if (booking.userId) {
      if (!authUser) {
        return NextResponse.json(
          { success: false, code: "UNAUTHORIZED", message: "Please sign in to cancel this booking." },
          { status: 401 }
        );
      }

      const isCustomer = booking.userId === authUser.id;
      const isOwner = booking.court.venue.ownerId === authUser.id;
      const isAdmin = authUser.role === "ADMIN";

      if (!isCustomer && !isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, code: "FORBIDDEN", message: "You are not authorized to cancel this booking." },
          { status: 403 }
        );
      }
    }

    const cancelledBooking = await cancelBooking(bookingId, {
      reason,
      cancelledByUserId: authUser?.id,
    });

    return NextResponse.json({
      success: true,
      message: "Booking has been cancelled and slot released.",
      booking: cancelledBooking,
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 403 }
      );
    }

    console.error("POST /api/bookings/[id]/cancel error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to cancel booking." },
      { status: 500 }
    );
  }
}
