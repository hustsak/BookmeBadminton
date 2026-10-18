import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notification-service";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view notification preferences.",
        },
        { status: 401 }
      );
    }

    const preferences = await getNotificationPreferences(authUser.id);

    return NextResponse.json({
      success: true,
      preferences: {
        ...preferences,
        channels: {
          inApp: { available: true, status: "active" },
          email: { available: false, status: "unavailable", note: "Email delivery service not configured in this deployment." },
          push: { available: false, status: "unavailable", note: "Web push notifications not configured in this deployment." },
          sms: { available: false, status: "unavailable", note: "SMS gateway not configured in this deployment." },
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/notifications/preferences error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve notification preferences.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to update notification preferences.",
        },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // Validate input types if provided
    const { bookingUpdates, matchUpdates, reminders, social } = body;
    if (
      (bookingUpdates !== undefined && typeof bookingUpdates !== "boolean") ||
      (matchUpdates !== undefined && typeof matchUpdates !== "boolean") ||
      (reminders !== undefined && typeof reminders !== "boolean") ||
      (social !== undefined && typeof social !== "boolean")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Preference values must be boolean.",
        },
        { status: 400 }
      );
    }

    const updated = await updateNotificationPreferences(authUser.id, {
      bookingUpdates,
      matchUpdates,
      reminders,
      social,
    });

    return NextResponse.json({
      success: true,
      message: "Notification preferences updated successfully.",
      preferences: {
        ...updated,
        channels: {
          inApp: { available: true, status: "active" },
          email: { available: false, status: "unavailable", note: "Email delivery service not configured in this deployment." },
          push: { available: false, status: "unavailable", note: "Web push notifications not configured in this deployment." },
          sms: { available: false, status: "unavailable", note: "SMS gateway not configured in this deployment." },
        },
      },
    });
  } catch (error: any) {
    console.error("POST /api/notifications/preferences error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update notification preferences.",
      },
      { status: 500 }
    );
  }
}
