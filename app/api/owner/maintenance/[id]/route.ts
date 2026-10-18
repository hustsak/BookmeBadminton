import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const blockId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId");

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

    // Strict Venue Isolation
    if (ownerId && block.court.venue.ownerId !== parseInt(ownerId, 10)) {
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
