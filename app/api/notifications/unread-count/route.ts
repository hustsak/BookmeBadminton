import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notification-service";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view unread notification count.",
        },
        { status: 401 }
      );
    }

    const count = await getUnreadCount(authUser.id);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error: any) {
    console.error("GET /api/notifications/unread-count error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve unread notification count.",
      },
      { status: 500 }
    );
  }
}
