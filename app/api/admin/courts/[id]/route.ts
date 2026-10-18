import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { toggleCourtActive, updateAdminCourt } from "@/lib/admin-service";

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
    const courtId = parseInt(id, 10);
    if (isNaN(courtId)) {
      return NextResponse.json(
        { success: false, message: "Invalid court ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isActive, name, priceHour, surface, reason } = body;

    let resultCourt;

    if (typeof isActive === "boolean" && name === undefined && priceHour === undefined && surface === undefined) {
      resultCourt = await toggleCourtActive(user.id, courtId, isActive, reason);
    } else {
      resultCourt = await updateAdminCourt(
        user.id,
        courtId,
        {
          name,
          priceHour: priceHour ? parseInt(priceHour, 10) : undefined,
          surface,
          isActive,
        },
        reason
      );
    }

    return NextResponse.json({
      success: true,
      message: "Court updated successfully.",
      data: resultCourt,
    });
  } catch (error: any) {
    console.error("Admin Court PATCH API Error:", error);
    const status = error.message.includes("Cannot deactivate") ? 400 : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update court." },
      { status }
    );
  }
}
