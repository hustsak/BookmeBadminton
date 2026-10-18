import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notification-service";
import { NotificationType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view your notifications.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const typeParam = searchParams.get("type");

    let type: NotificationType | undefined = undefined;
    if (typeParam && Object.values(NotificationType).includes(typeParam as NotificationType)) {
      type = typeParam as NotificationType;
    }

    const result = await getUserNotifications(authUser.id, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 15 : limit,
      unreadOnly,
      type,
    });

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve notifications.",
      },
      { status: 500 }
    );
  }
}
