import { NextResponse } from "next/server";
import { getLeaderboard, LeaderboardMetric, LeaderboardPeriod } from "@/lib/leaderboard-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = (searchParams.get("metric") as LeaderboardMetric) || "wins";
    const period = (searchParams.get("period") as LeaderboardPeriod) || "all-time";
    const venueIdParam = searchParams.get("venueId");
    const venueId = venueIdParam ? parseInt(venueIdParam, 10) : undefined;
    const skillLevel = searchParams.get("skillLevel") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const leaderboard = await getLeaderboard({
      metric,
      period,
      venueId,
      skillLevel,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...leaderboard,
    });
  } catch (error: any) {
    console.error("Error fetching leaderboards:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load leaderboard." },
      { status: 500 }
    );
  }
}
