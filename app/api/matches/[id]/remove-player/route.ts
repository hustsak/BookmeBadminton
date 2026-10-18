import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  removeParticipantFromMatch,
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
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(request, body.userId);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Authentication required to manage participants. Please sign in.",
        },
        { status: 401 }
      );
    }

    const targetUserId = parseInt(body.targetUserId, 10);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, message: "Valid numeric targetUserId is required." },
        { status: 400 }
      );
    }

    const updatedMatch = await removeParticipantFromMatch(
      matchId,
      authUser.id,
      targetUserId,
      body.reason
    );

    return NextResponse.json({
      success: true,
      message: "Player removed from match successfully. Spot has been reopened.",
      match: updatedMatch,
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

    console.error("POST /api/matches/[id]/remove-player error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to remove player from match." },
      { status: 500 }
    );
  }
}
