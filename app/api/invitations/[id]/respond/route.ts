import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { respondToInvitation } from "@/lib/invitation-service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const invitationId = parseInt(id, 10);
    if (isNaN(invitationId)) {
      return NextResponse.json(
        { success: false, message: "Invalid invitation ID." },
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
          message: "Please sign in to respond to this invitation.",
        },
        { status: 401 }
      );
    }

    const action = body.action?.toUpperCase();
    if (action !== "ACCEPT" && action !== "DECLINE") {
      return NextResponse.json(
        {
          success: false,
          message: "Action must be either 'ACCEPT' or 'DECLINE'.",
        },
        { status: 400 }
      );
    }

    const result = await respondToInvitation(invitationId, authUser.id, action);

    return NextResponse.json({
      success: true,
      message:
        action === "ACCEPT"
          ? "Invitation accepted! You have joined the match."
          : "Invitation declined.",
      invitation: result,
    });
  } catch (error: any) {
    const msg = error.message || "Failed to respond to invitation.";
    const status = msg.includes("not authorized") || msg.includes("permission")
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
