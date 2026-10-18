import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { submitMatchResult, getMatchResult } from "@/lib/match-result-service";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId) || matchId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid match ID." },
        { status: 400 }
      );
    }

    const result = await getMatchResult(matchId);
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Error getting match result:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve match result." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required to submit match results." },
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

    const body = await request.json();
    const { score, setScores, winnerTeam, team1PlayerIds, team2PlayerIds } = body;

    const result = await submitMatchResult({
      matchId,
      submittedById: user.id,
      score,
      setScores,
      winnerTeam,
      team1PlayerIds,
      team2PlayerIds,
    });

    return NextResponse.json({
      success: true,
      message: "Match result submitted successfully.",
      result,
    });
  } catch (error: any) {
    console.error("Error submitting match result:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit match result." },
      { status: 400 }
    );
  }
}
