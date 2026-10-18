import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOwner } from "@/lib/auth";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isForbidden } = await getAuthenticatedOwner(request);

    if (isForbidden) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. Owner or Admin privileges required." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const blockId = parseInt(id, 10);
    if (isNaN(blockId)) {
      return NextResponse.json(
        { success: false, message: "Invalid maintenance block ID." },
        { status: 400 }
      );
    }

    const block = await prisma.maintenanceBlock.findUnique({
      where: { id: blockId },
      include: {
        court: { include: { venue: true } },
      },
    });

    if (!block) {
      return NextResponse.json(
        { success: false, message: "Maintenance block not found." },
        { status: 404 }
      );
    }

    // Strict Ownership Check: Must own this court's venue or be Admin
    if (user.role !== "ADMIN" && block.court.venue.ownerId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          code: "FORBIDDEN",
          message: "Access denied. You do not own this court's venue.",
        },
        { status: 403 }
      );
    }

    await prisma.maintenanceBlock.delete({
      where: { id: blockId },
    });

    return NextResponse.json({
      success: true,
      message: "Maintenance block removed.",
    });
  } catch (error: any) {
    console.error("DELETE /api/owner/maintenance/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete maintenance block." },
      { status: 500 }
    );
  }
}

