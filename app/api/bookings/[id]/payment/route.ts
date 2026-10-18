import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { recordPayment, NotFoundError, ValidationError } from "@/lib/booking-engine";

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

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "Cannot record payment for a cancelled booking." },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(request);
    if (authUser) {
      const isCustomer = booking.userId === authUser.id;
      const isOwner = booking.court.venue.ownerId === authUser.id;
      const isAdmin = authUser.role === "ADMIN";

      if (!isCustomer && !isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, code: "FORBIDDEN", message: "You are not authorized to process payment for this booking." },
          { status: 403 }
        );
      }
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body optional
    }

    const { transactionRef, paymentMethod = "VIETQR" } = body;

    const updatedBooking = await recordPayment(bookingId, {
      transactionRef,
      paymentMethod,
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and recorded.",
      booking: updatedBooking,
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

    console.error("POST /api/bookings/[id]/payment error:", error);
    return NextResponse.json(
      { success: false, message: "Payment verification failed." },
      { status: 500 }
    );
  }
}
