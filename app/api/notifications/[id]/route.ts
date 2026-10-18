import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { markAsRead, deleteNotification } from "@/lib/notification-service";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const notificationId = parseInt(id, 10);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, message: "Invalid notification ID." },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to update notifications.",
        },
        { status: 401 }
      );
    }

    const updated = await markAsRead(notificationId, authUser.id);

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
      notification: updated,
    });
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }
    if (error.message?.includes("permission")) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update notification." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const notificationId = parseInt(id, 10);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, message: "Invalid notification ID." },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to delete notifications.",
        },
        { status: 401 }
      );
    }

    await deleteNotification(notificationId, authUser.id);

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }
    if (error.message?.includes("permission")) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete notification." },
      { status: 500 }
    );
  }
}
