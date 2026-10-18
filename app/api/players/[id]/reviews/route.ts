import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerReviews } from "@/lib/player-review-service";

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Resolve user ID
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

    const result = await getPlayerReviews(targetUserId, { page, limit });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error fetching player reviews:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch reviews." },
      { status: 500 }
    );
  }
}
