import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { toggleVenueActive, updateAdminVenue } from "@/lib/admin-service";

export async function PATCH(
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
    const venueId = parseInt(id, 10);
    if (isNaN(venueId)) {
      return NextResponse.json(
        { success: false, message: "Invalid venue ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isActive, reason, ...metadata } = body;

    let resultVenue;

    // If isActive toggle is requested, handle safety check
    if (typeof isActive === "boolean") {
      resultVenue = await toggleVenueActive(user.id, venueId, isActive, reason);
    }

    // If metadata fields are provided, update them
    if (Object.keys(metadata).length > 0) {
      resultVenue = await updateAdminVenue(user.id, venueId, metadata, reason);
    }

    return NextResponse.json({
      success: true,
      message: "Venue updated successfully.",
      data: resultVenue,
    });
  } catch (error: any) {
    console.error("Admin Venue PATCH API Error:", error);
    const status = error.message.includes("Cannot deactivate") ? 400 : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update venue." },
      { status }
    );
  }
}
