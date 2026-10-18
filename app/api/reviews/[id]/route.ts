import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { updatePlayerReview } from "@/lib/player-review-service";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required to edit reviews." },
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
    const { rating, comment } = body;

    const review = await updatePlayerReview({
      reviewId,
      reviewerId: user.id,
      rating: rating !== undefined ? Number(rating) : undefined,
      comment,
    });

    return NextResponse.json({
      success: true,
      message: "Review updated successfully.",
      review,
    });
  } catch (error: any) {
    console.error("Error updating player review:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update review." },
      { status: 400 }
    );
  }
}
