import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { toggleUserSuspension } from "@/lib/admin-service";

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
    const targetUserId = parseInt(id, 10);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, reason } = body;

    if (action !== "SUSPEND" && action !== "REACTIVATE") {
      return NextResponse.json(
        { success: false, message: "Action must be either SUSPEND or REACTIVATE." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "A valid reason (minimum 3 characters) is required." },
        { status: 400 }
      );
    }

    const updatedUser = await toggleUserSuspension(
      user.id,
      targetUserId,
      action,
      reason.trim()
    );

    return NextResponse.json({
      success: true,
      message: `User successfully ${action === "SUSPEND" ? "suspended" : "reactivated"}.`,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Admin User Suspension API Error:", error);
    const status = error.message.includes("cannot suspend") ? 400 : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update user status." },
      { status }
    );
  }
}
