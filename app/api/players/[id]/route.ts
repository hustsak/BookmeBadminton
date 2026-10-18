import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getPlayerStats,
  calculatePlayerCompatibility,
} from "@/lib/matchmaking-engine";
import { getPlayerStatistics } from "@/lib/player-statistics";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const playerId = parseInt(id, 10);
    if (isNaN(playerId)) {
      return NextResponse.json(
        { success: false, message: "Invalid player ID." },
        { status: 400 }
      );
    }

    // Try finding by PlayerProfile id or userId
    let profile = await prisma.playerProfile.findFirst({
      where: {
        OR: [{ id: playerId }, { userId: playerId }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        homeVenue: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Player profile not found." },
        { status: 404 }
      );
    }

    const stats = await getPlayerStats(profile.userId);

    // Fetch player's upcoming matches
    const upcomingMatches = await prisma.match.findMany({
      where: {
        status: { in: ["OPEN", "FULL"] },
        participants: {
          some: {
            userId: profile.userId,
            status: "JOINED",
          },
        },
      },
      include: {
        venue: true,
        court: true,
        creator: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
      take: 4,
    });

    // Check compatibility with viewer if logged in
    const authUser = await getAuthenticatedUser(request);
    let compatibility = null;
    if (authUser && authUser.id !== profile.userId) {
      const viewerProfile = await prisma.playerProfile.findUnique({
        where: { userId: authUser.id },
        include: { homeVenue: true },
      });
      if (viewerProfile) {
        compatibility = calculatePlayerCompatibility(viewerProfile, profile);
      }
    }

    const statistics = await getPlayerStatistics(profile.userId);

    return NextResponse.json({
      success: true,
      player: {
        ...profile,
        stats,
        statistics,
        upcomingMatches,
        compatibility,
      },
    });
  } catch (error: any) {
    console.error("GET /api/players/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve player profile." },
      { status: 500 }
    );
  }
}
