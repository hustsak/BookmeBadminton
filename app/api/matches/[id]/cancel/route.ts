import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  cancelMatch,
  MatchValidationError,
  MatchNotFoundError,
  MatchAuthorizationError,
} from "@/lib/match-engine";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid match ID." },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body optional
    }

    const authUser = await getAuthenticatedUser(request, body.userId);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to cancel this match.",
        },
        { status: 401 }
      );
    }

    const cancelledMatch = await cancelMatch(matchId, authUser.id, body.reason);

    return NextResponse.json({
      success: true,
      message: "Match has been cancelled successfully.",
      match: cancelledMatch,
    });
  } catch (error: any) {
    if (error instanceof MatchAuthorizationError) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }
    if (error instanceof MatchValidationError) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof MatchNotFoundError) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    console.error("POST /api/matches/[id]/cancel error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel match." },
      { status: 500 }
    );
  }
}
