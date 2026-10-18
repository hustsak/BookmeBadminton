import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDateString } from "@/lib/booking-engine";
import { getAuthenticatedOwner } from "@/lib/auth";
import { PaymentStatus } from "@prisma/client";

export async function GET(request: Request) {
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
        { success: false, message: "No venue owner found." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const venueIdParam = searchParams.get("venueId");
    const courtIdParam = searchParams.get("courtId");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const date = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const sortByParam = searchParams.get("sortBy") || "bookingDate";
    const sortOrderParam = searchParams.get("sortOrder") || "desc";

    // Get all venues owned by this owner (or all venues if ADMIN)
    const ownedVenues = await prisma.venue.findMany({
      where: user.role === "ADMIN" ? {} : { ownerId: user.id },
      select: { id: true, name: true, currency: true },
    });
    const ownedVenueIds = ownedVenues.map((v) => v.id);

    if (ownedVenueIds.length === 0) {
      return NextResponse.json({
        success: true,
        bookings: [],
        count: 0,
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        ownedVenueIds: [],
      });
    }

    let targetVenueIds = ownedVenueIds;

    // Strict Venue Isolation if specific venueId requested
    if (venueIdParam) {
      const reqVenueId = parseInt(venueIdParam, 10);
      if (!ownedVenueIds.includes(reqVenueId)) {
        return NextResponse.json(
          {
            success: false,
            code: "FORBIDDEN",
            message: "Access denied. You do not own this venue.",
          },
          { status: 403 }
        );
      }
      targetVenueIds = [reqVenueId];
    }

    const whereClause: any = {
      court: {
        venueId: { in: targetVenueIds },
      },
    };

    if (courtIdParam) {
      whereClause.courtId = parseInt(courtIdParam, 10);
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      whereClause.paymentStatus = paymentStatus;
    }

    if (date) {
      const normalizedDate = normalizeDateString(date);
      const startOfDay = new Date(`${normalizedDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${normalizedDate}T23:59:59.999Z`);
      whereClause.bookingDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDateParam || endDateParam) {
      const dateFilter: any = {};
      if (startDateParam) {
        const norm = normalizeDateString(startDateParam);
        dateFilter.gte = new Date(`${norm}T00:00:00.000Z`);
      }
      if (endDateParam) {
        const norm = normalizeDateString(endDateParam);
        dateFilter.lte = new Date(`${norm}T23:59:59.999Z`);
      }
      whereClause.bookingDate = dateFilter;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { bookingCode: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const totalCount = await prisma.booking.count({ where: whereClause });

    // Sorting
    const sortField = ["bookingDate", "createdAt", "totalPrice", "startTime"].includes(sortByParam)
      ? sortByParam
      : "bookingDate";
    const sortDirection = sortOrderParam === "asc" ? "asc" : "desc";

    const orderBy: any[] = [{ [sortField]: sortDirection }];
    if (sortField !== "startTime") {
      orderBy.push({ startTime: "desc" });
    }

    // Pagination
    let skip: number | undefined = undefined;
    let take: number | undefined = undefined;
    let page = 1;
    let limit = totalCount;

    if (pageParam || limitParam) {
      page = Math.max(1, parseInt(pageParam || "1", 10));
      limit = Math.min(100, Math.max(1, parseInt(limitParam || "10", 10)));
      skip = (page - 1) * limit;
      take = limit;
    }

    const rawBookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        court: {
          include: { venue: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy,
      skip,
      take,
    });

    const bookings = rawBookings.map((b) => {
      const collectedAmount = b.payments
        .filter((p) => p.status === PaymentStatus.PAID)
        .reduce((sum, p) => sum + p.amount, 0);

      const customerName = b.customerName || b.user?.name || "Customer";
      const customerEmail = b.customerEmail || b.user?.email || "";
      const customerPhone = b.customerPhone || b.user?.phone || "";

      return {
        ...b,
        customerDisplayName: customerName,
        customerDisplayEmail: customerEmail,
        customerDisplayPhone: customerPhone,
        collectedAmount,
        outstandingAmount: Math.max(0, b.totalPrice - collectedAmount),
      };
    });

    const totalPages = Math.ceil(totalCount / (limit || 1)) || 1;

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
      totalCount,
      page,
      limit,
      totalPages,
      ownedVenueIds,
    });
  } catch (error: any) {
    console.error("GET /api/owner/bookings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch owner bookings." },
      { status: 500 }
    );
  }
}
