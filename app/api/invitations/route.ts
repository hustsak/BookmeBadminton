import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { listUserInvitations } from "@/lib/invitation-service";
import { InvitationStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view your invitations.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");

    const type = typeParam === "sent" ? "sent" : "received";
    let status: InvitationStatus | undefined = undefined;
    if (statusParam && Object.values(InvitationStatus).includes(statusParam as InvitationStatus)) {
      status = statusParam as InvitationStatus;
    }

    const invitations = await listUserInvitations(authUser.id, {
      type,
      status,
    });

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error: any) {
    console.error("GET /api/invitations error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retrieve invitations.",
      },
      { status: 500 }
    );
  }
}
