import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { listPlayers } from "@/lib/matchmaking-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const skillLevel = searchParams.get("skillLevel") || undefined;
    const playingStyle = searchParams.get("playingStyle") || undefined;
    const venueIdParam = searchParams.get("venueId");
    const venueId = venueIdParam ? parseInt(venueIdParam, 10) : undefined;

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 12;

    const authUser = await getAuthenticatedUser(request);

    const result = await listPlayers({
      search,
      skillLevel,
      playingStyle,
      venueId: venueId && !isNaN(venueId) ? venueId : undefined,
      currentUserId: authUser?.id,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      players: result.players,
      pagination: result.pagination,
      count: result.players.length,
    });
  } catch (error: any) {
    console.error("GET /api/players error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch players list." },
      { status: 500 }
    );
  }
}
