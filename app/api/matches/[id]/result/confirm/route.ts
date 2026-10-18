import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { confirmMatchResult } from "@/lib/match-result-service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required to confirm match results." },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId) || matchId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid match ID." },
        { status: 400 }
      );
    }

    const result = await confirmMatchResult({
      matchId,
      confirmedById: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Match result confirmed and match marked as completed.",
      result,
    });
  } catch (error: any) {
    console.error("Error confirming match result:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to confirm match result." },
      { status: 400 }
    );
  }
}
