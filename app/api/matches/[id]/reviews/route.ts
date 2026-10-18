import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { createPlayerReview } from "@/lib/player-review-service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required to submit reviews." },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId) || matchId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid match ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { recipientId, rating, comment } = body;

    const review = await createPlayerReview({
      matchId,
      reviewerId: user.id,
      recipientId: Number(recipientId),
      rating: Number(rating),
      comment,
    });

    return NextResponse.json({
      success: true,
      message: "Player review submitted successfully.",
      review,
    });
  } catch (error: any) {
    console.error("Error submitting player review:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit review." },
      { status: 400 }
    );
  }
}
