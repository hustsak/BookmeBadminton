import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getReviewReports, resolveReviewReport, getAdminMatches } from "@/lib/admin-service";

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
    const type = searchParams.get("type") || "reviews";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    if (type === "matches") {
      const result = await getAdminMatches({ page, limit, status, search });
      return NextResponse.json({ success: true, data: result });
    }

    const result = await getReviewReports({ page, limit, status });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Admin Moderation GET API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load moderation data." },
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
    const { reportId, action, reason } = body;

    if (!reportId || isNaN(parseInt(reportId, 10))) {
      return NextResponse.json(
        { success: false, message: "Valid reportId is required." },
        { status: 400 }
      );
    }

    if (action !== "REVIEW_HIDDEN" && action !== "DISMISSED") {
      return NextResponse.json(
        { success: false, message: "Action must be REVIEW_HIDDEN or DISMISSED." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "A resolution reason (minimum 3 characters) is required." },
        { status: 400 }
      );
    }

    const resolved = await resolveReviewReport(user.id, parseInt(reportId, 10), {
      action,
      reason: reason.trim(),
    });

    return NextResponse.json({
      success: true,
      message: `Report resolved with action ${action}.`,
      data: resolved,
    });
  } catch (error: any) {
    console.error("Admin Moderation POST API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to resolve report." },
      { status: 400 }
    );
  }
}
