import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(
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
      include: {
        court: {
          include: {
            venue: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    const authUser = await getAuthenticatedUser(request);
    if (authUser) {
      const isOwner = authUser.role === "OWNER" && booking.court.venue.ownerId === authUser.id;
      const isAdmin = authUser.role === "ADMIN";
      const isCustomerOwner = booking.userId === authUser.id;

      if (!isAdmin && !isOwner && !isCustomerOwner) {
        return NextResponse.json(
          { success: false, code: "FORBIDDEN", message: "You are not authorized to view this booking." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error: any) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve booking." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "Authentication required to update booking." },
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

    const body = await request.json().catch(() => ({}));
    const { status, paymentStatus, notes } = body;

    const isAdmin = authUser.role === "ADMIN";
    const isOwner = authUser.role === "OWNER" && booking.court.venue.ownerId === authUser.id;
    const isCustomer = booking.userId === authUser.id;

    if (!isAdmin && !isOwner && !isCustomer) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. You cannot modify this booking." },
        { status: 403 }
      );
    }

    // Customers can NEVER approve payments or change booking status directly!
    if (!isAdmin && !isOwner && (status !== undefined || paymentStatus !== undefined)) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Customers cannot alter booking status or payment status directly." },
        { status: 403 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: (isAdmin || isOwner) && status ? status : undefined,
        paymentStatus: (isAdmin || isOwner) && paymentStatus ? paymentStatus : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        court: { include: { venue: true } },
        user: true,
        payments: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking updated.",
      booking: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/bookings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update booking." },
      { status: 500 }
    );
  }
}
