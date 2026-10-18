import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerStatistics } from "@/lib/player-statistics";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid player ID." },
        { status: 400 }
      );
    }

    // Resolve user ID: id might be a User ID or a PlayerProfile ID
    let targetUserId = numericId;
    const profile = await prisma.playerProfile.findFirst({
      where: {
        OR: [{ id: numericId }, { userId: numericId }],
      },
    });

    if (profile) {
      targetUserId = profile.userId;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: numericId },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Player not found." },
          { status: 404 }
        );
      }
    }

    const statistics = await getPlayerStatistics(targetUserId);

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error: any) {
    console.error("Error fetching player statistics:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch statistics." },
      { status: 500 }
    );
  }
}
