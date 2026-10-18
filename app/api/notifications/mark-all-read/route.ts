import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { markAllAsRead } from "@/lib/notification-service";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to mark notifications as read.",
        },
        { status: 401 }
      );
    }

    const result = await markAllAsRead(authUser.id);

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      count: result.count,
    });
  } catch (error: any) {
    console.error("POST /api/notifications/mark-all-read error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to mark notifications as read.",
      },
      { status: 500 }
    );
  }
}
