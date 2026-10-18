import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  listMatches,
  createMatch,
  MatchValidationError,
  MatchConflictError,
  MatchNotFoundError,
} from "@/lib/match-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const venueIdParam = searchParams.get("venueId");
    const venueId = venueIdParam ? parseInt(venueIdParam, 10) : undefined;
    const skillLevel = searchParams.get("skillLevel") || undefined;
    const availableSpotsParam = searchParams.get("availableSpots");
    const availableSpots =
      availableSpotsParam === "true" ||
      availableSpotsParam === "1" ||
      availableSpotsParam === "yes";
    const status = searchParams.get("status") || undefined;

    // Check optional authenticated user for isJoined / isCreator badges
    const authUser = await getAuthenticatedUser(request);

    const matches = await listMatches({
      date,
      venueId: venueId && !isNaN(venueId) ? venueId : undefined,
      skillLevel,
      availableSpots,
      status,
      userId: authUser?.id,
    });

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
    });
  } catch (error: any) {
    console.error("GET /api/matches error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch matches." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // Resolve authenticated user - do NOT trust client-supplied roles!
    const authUser = await getAuthenticatedUser(request, body.userId);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Authentication required to create a match. Please sign in.",
        },
        { status: 401 }
      );
    }

    const {
      title,
      venueId,
      courtId,
      bookingId,
      date,
      startTime,
      endTime,
      skillLevel,
      maxPlayers,
      format,
      feePerPerson,
      shuttlecockProvided,
      description,
    } = body;

    const match = await createMatch({
      creatorId: authUser.id, // Strictly server-authenticated user ID
      venueId: parseInt(venueId, 10),
      courtId: courtId ? parseInt(courtId, 10) : undefined,
      bookingId: bookingId ? parseInt(bookingId, 10) : undefined,
      title,
      date,
      startTime,
      endTime,
      skillLevel,
      maxPlayers: maxPlayers ? parseInt(maxPlayers, 10) : undefined,
      format,
      feePerPerson: feePerPerson ? parseInt(feePerPerson, 10) : undefined,
      shuttlecockProvided,
      description,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Open match created successfully.",
        match,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof MatchValidationError) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: error.message,
        },
        { status: 400 }
      );
    }
    if (error instanceof MatchConflictError) {
      return NextResponse.json(
        {
          success: false,
          code: "CONFLICT",
          message: error.message,
        },
        { status: 409 }
      );
    }
    if (error instanceof MatchNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

    console.error("POST /api/matches error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create match." },
      { status: 500 }
    );
  }
}
