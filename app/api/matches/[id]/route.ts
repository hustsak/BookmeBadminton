import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getMatchById,
  updateMatch,
  MatchValidationError,
  MatchNotFoundError,
  MatchAuthorizationError,
  MatchConflictError,
} from "@/lib/match-engine";

export async function GET(
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

    const authUser = await getAuthenticatedUser(request);
    const match = await getMatchById(matchId, authUser?.id);

    return NextResponse.json({
      success: true,
      match,
    });
  } catch (error: any) {
    if (error instanceof MatchNotFoundError) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    console.error("GET /api/matches/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch match details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Authenticate user
    const authUser = await getAuthenticatedUser(request, body.userId);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Authentication required to edit match. Please sign in.",
        },
        { status: 401 }
      );
    }

    const updatedMatch = await updateMatch(matchId, authUser.id, {
      title: body.title,
      venueId: body.venueId ? parseInt(body.venueId, 10) : undefined,
      courtId: body.courtId !== undefined ? (body.courtId ? parseInt(body.courtId, 10) : null) : undefined,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      skillLevel: body.skillLevel,
      maxPlayers: body.maxPlayers ? parseInt(body.maxPlayers, 10) : undefined,
      format: body.format,
      feePerPerson: body.feePerPerson !== undefined ? parseInt(body.feePerPerson, 10) : undefined,
      shuttlecockProvided: body.shuttlecockProvided,
      description: body.description,
    });

    return NextResponse.json({
      success: true,
      message: "Match updated successfully.",
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
    if (error instanceof MatchConflictError) {
      return NextResponse.json(
        { success: false, code: "CONFLICT", message: error.message },
        { status: 409 }
      );
    }

    console.error("PATCH /api/matches/[id] error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update match." },
      { status: 500 }
    );
  }
}
