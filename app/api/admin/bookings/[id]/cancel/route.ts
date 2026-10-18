import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { adminCancelBooking } from "@/lib/admin-service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
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

    const { id } = await props.params;
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "A valid cancellation reason (minimum 3 characters) is required." },
        { status: 400 }
      );
    }

    const cancelledBooking = await adminCancelBooking(user.id, bookingId, reason.trim());

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully by administrator.",
      data: cancelledBooking,
    });
  } catch (error: any) {
    console.error("Admin Booking Cancel API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel booking." },
      { status: 400 }
    );
  }
}
