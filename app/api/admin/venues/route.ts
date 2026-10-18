import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getAdminVenues, createAdminVenue } from "@/lib/admin-service";

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as "ALL" | "ACTIVE" | "INACTIVE") || undefined;

    const result = await getAdminVenues({
      page,
      limit,
      search,
      status,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Admin Venues GET API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load venues." },
      { status: 500 }
    );
  }
}

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
    const venue = await createAdminVenue(user.id, body);

    return NextResponse.json({
      success: true,
      message: "Venue created successfully.",
      data: venue,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Admin Venues POST API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create venue." },
      { status: 400 }
    );
  }
}
