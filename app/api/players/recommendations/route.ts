import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getRecommendedPlayers } from "@/lib/matchmaking-engine";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view your tailored player recommendations.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const recommendations = await getRecommendedPlayers(authUser.id, limit);

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    console.error("GET /api/players/recommendations error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate recommendations." },
      { status: 500 }
    );
  }
}
