import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { disputeMatchResult } from "@/lib/match-result-service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required to dispute match results." },
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
    const { reason } = body;

    const result = await disputeMatchResult({
      matchId,
      disputedById: user.id,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Match result disputed successfully.",
      result,
    });
  } catch (error: any) {
    console.error("Error disputing match result:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to dispute match result." },
      { status: 400 }
    );
  }
}
