import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { reportPlayerReview } from "@/lib/player-review-service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required to report reviews." },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId) || reviewId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid review ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason, details } = body;

    const report = await reportPlayerReview({
      reviewId,
      reporterId: user.id,
      reason,
      details,
    });

    return NextResponse.json({
      success: true,
      message: "Review reported successfully. Our moderation team will investigate.",
      reportId: report.id,
    });
  } catch (error: any) {
    console.error("Error reporting player review:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to report review." },
      { status: 400 }
    );
  }
}
