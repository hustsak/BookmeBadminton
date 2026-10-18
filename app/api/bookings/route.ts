import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  createBooking,
  SlotConflictError,
  ValidationError,
  NotFoundError,
  normalizeDateString,
} from "@/lib/booking-engine";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    const courtId = searchParams.get("courtId");
    const venueId = searchParams.get("venueId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    // Unauthenticated public requests cannot list customer bookings
    if (!authUser) {
      return NextResponse.json({
        success: true,
        bookings: [],
        count: 0,
      });
    }

    const whereClause: any = {};

    // Role-based scoping: customers can ONLY see their own bookings
    if (authUser.role === "ADMIN") {
      if (requestedUserId) {
        whereClause.userId = parseInt(requestedUserId, 10);
      }
      if (venueId) {
        whereClause.court = { venueId: parseInt(venueId, 10) };
      }
    } else if (authUser.role === "OWNER") {
      if (requestedUserId && parseInt(requestedUserId, 10) === authUser.id) {
        whereClause.userId = authUser.id;
      } else {
        whereClause.court = { venue: { ownerId: authUser.id } };
      }
    } else {
      // Regular customer is strictly scoped to their own account
      whereClause.userId = authUser.id;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (date) {
      const normalizedDate = normalizeDateString(date);
      const startOfDay = new Date(`${normalizedDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${normalizedDate}T23:59:59.999Z`);
      whereClause.bookingDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
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
      orderBy: [
        { bookingDate: "desc" },
        { startTime: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
    });
  } catch (error: any) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch bookings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      courtId,
      bookingDate,
      startTime,
      duration,
      userId,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod,
      notes,
      idempotencyKey,
    } = body;

    // Delegate to transactional booking engine with advisory lock
    const { booking, isIdempotentReplay } = await createBooking({
      courtId,
      bookingDate,
      startTime,
      duration,
      userId,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod,
      notes,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        success: true,
        message: isIdempotentReplay
          ? "Booking already created (idempotent submission)."
          : "Court booking confirmed successfully.",
        booking,
      },
      { status: isIdempotentReplay ? 200 : 201 }
    );
  } catch (error: any) {
    if (error instanceof SlotConflictError) {
      return NextResponse.json(
        {
          success: false,
          code: "SLOT_CONFLICT",
          message: error.message,
        },
        { status: 409 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating the booking.",
      },
      { status: 500 }
    );
  }
}