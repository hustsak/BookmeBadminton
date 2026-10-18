import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getAdminUsers } from "@/lib/admin-service";

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
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const sortBy = (searchParams.get("sortBy") as "createdAt" | "name" | "email") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    const result = await getAdminUsers({
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Admin Users API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load users." },
      { status: 500 }
    );
  }
}
