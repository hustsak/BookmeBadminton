import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getRecommendedMatchesForPlayer } from "@/lib/matchmaking-engine";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view tailored match recommendations.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    const matches = await getRecommendedMatchesForPlayer(authUser.id, limit);

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
    });
  } catch (error: any) {
    console.error("GET /api/matches/recommendations error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate match recommendations." },
      { status: 500 }
    );
  }
}
