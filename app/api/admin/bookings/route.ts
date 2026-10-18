import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getAdminBookings } from "@/lib/admin-service";

export async function GET(request: Request) {
  try {
    const { user, isForbidden } = await getAuthenticatedAdmin(request);

    if (isForbidden) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Forbidden. Admin privileges required." },
        { status: 403 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const venueIdParam = searchParams.get("venueId");
    const venueId = venueIdParam ? parseInt(venueIdParam, 10) : undefined;
    const courtIdParam = searchParams.get("courtId");
    const courtId = courtIdParam ? parseInt(courtIdParam, 10) : undefined;
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;

    const result = await getAdminBookings({
      page,
      limit,
      search,
      venueId,
      courtId,
      date,
      status,
      paymentStatus,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Admin Bookings API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load bookings." },
      { status: 500 }
    );
  }
}
