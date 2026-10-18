import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  createMatchInvitation,
  listMatchInvitations,
} from "@/lib/invitation-service";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid match ID." },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(request, body.userId);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to invite players.",
        },
        { status: 401 }
      );
    }

    const recipientId = parseInt(body.recipientId, 10);
    if (isNaN(recipientId) || recipientId <= 0) {
      return NextResponse.json(
        { success: false, message: "Recipient player ID is required." },
        { status: 400 }
      );
    }

    const invitation = await createMatchInvitation({
      senderId: authUser.id,
      recipientId,
      matchId,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully!",
      invitation,
    });
  } catch (error: any) {
    const msg = error.message || "Failed to send match invitation.";
    const status = msg.includes("full") || msg.includes("already")
      ? 400
      : msg.includes("must be") || msg.includes("permission")
      ? 403
      : msg.includes("not found")
      ? 404
      : 400;

    return NextResponse.json(
      { success: false, message: msg },
      { status }
    );
  }
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid match ID." },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view invitations.",
        },
        { status: 401 }
      );
    }

    // Verify user is authorized (creator or joined participant)
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: { where: { status: "JOINED" } },
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, message: "Match not found." },
        { status: 404 }
      );
    }

    const isAuthorized =
      match.creatorId === authUser.id ||
      match.participants.some((p) => p.userId === authUser.id);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          code: "FORBIDDEN",
          message: "You are not authorized to view invitations for this match.",
        },
        { status: 403 }
      );
    }

    const invitations = await listMatchInvitations(matchId);

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error: any) {
    console.error("GET /api/matches/[id]/invitations error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to list invitations." },
      { status: 500 }
    );
  }
}
