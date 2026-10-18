import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getAdminOverviewKPIs } from "@/lib/admin-service";

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
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getAdminOverviewKPIs({ startDate, endDate });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Admin Overview API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load admin overview metrics." },
      { status: 500 }
    );
  }
}
