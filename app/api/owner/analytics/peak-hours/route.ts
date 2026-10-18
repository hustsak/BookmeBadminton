import { NextResponse } from "next/server";
import { getAuthenticatedOwner } from "@/lib/auth";
import { getOwnerPeakHoursAnalysis, DateFilterPreset } from "@/lib/owner-analytics";

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
    const courtIdParam = searchParams.get("courtId");
    const courtId = courtIdParam ? parseInt(courtIdParam, 10) : undefined;

    if (preset === "custom") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required for custom date range." },
          { status: 400 }
        );
      }
      if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid date format for startDate or endDate." },
          { status: 400 }
        );
      }
    }

    const peakHoursData = await getOwnerPeakHoursAnalysis(user.id, user.role, {
      preset,
      startDate,
      endDate,
      venueId,
      courtId,
    });

    return NextResponse.json({
      success: true,
      data: peakHoursData,
    });
  } catch (error: any) {
    if (error.code === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }
    console.error("GET /api/owner/analytics/peak-hours error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch peak hours analytics." },
      { status: 500 }
    );
  }
}
