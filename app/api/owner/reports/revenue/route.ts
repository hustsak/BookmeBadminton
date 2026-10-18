import { NextResponse } from "next/server";
import { getAuthenticatedOwner } from "@/lib/auth";
import { generateOwnerRevenueCsv, DateFilterPreset } from "@/lib/owner-analytics";

export async function GET(request: Request) {
  try {
    const { user, isForbidden } = await getAuthenticatedOwner(request);

    if (isForbidden) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. Owner or Admin privileges required." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const preset = (searchParams.get("preset") as DateFilterPreset) || "last30days";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const venueIdParam = searchParams.get("venueId");
    const venueId = venueIdParam ? parseInt(venueIdParam, 10) : undefined;
    const groupBy = (searchParams.get("groupBy") as "day" | "week" | "month") || "day";

    const csvContent = await generateOwnerRevenueCsv(user.id, user.role, {
      preset,
      startDate,
      endDate,
      venueId,
      groupBy,
    });

    const filename = `revenue_summary_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    if (error.code === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }
    console.error("GET /api/owner/reports/revenue error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate revenue report." },
      { status: 500 }
    );
  }
}
