import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getPlatformConfig, updatePlatformConfig } from "@/lib/admin-service";

export async function GET(request: Request) {
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

    const config = await getPlatformConfig();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Admin Settings GET API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load platform settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const { reason, ...data } = body;

    const updatedConfig = await updatePlatformConfig(user.id, data, reason);

    return NextResponse.json({
      success: true,
      message: "Platform settings updated successfully.",
      data: updatedConfig,
    });
  } catch (error: any) {
    console.error("Admin Settings PATCH API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update platform settings." },
      { status: 400 }
    );
  }
}
