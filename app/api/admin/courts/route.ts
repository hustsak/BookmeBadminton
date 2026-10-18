import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { createAdminCourt } from "@/lib/admin-service";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { venueId, name, priceHour, surface, isActive } = body;

    if (!venueId || isNaN(parseInt(venueId, 10))) {
      return NextResponse.json(
        { success: false, message: "Valid venueId is required." },
        { status: 400 }
      );
    }

    const court = await createAdminCourt(user.id, parseInt(venueId, 10), {
      name,
      priceHour: parseInt(priceHour, 10),
      surface,
      isActive,
    });

    return NextResponse.json({
      success: true,
      message: "Court created successfully.",
      data: court,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Admin Courts POST API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create court." },
      { status: 400 }
    );
  }
}
