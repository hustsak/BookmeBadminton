import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOwner } from "@/lib/auth";

export async function PATCH(
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
    const courtId = parseInt(id, 10);
    if (isNaN(courtId)) {
      return NextResponse.json(
        { success: false, message: "Invalid court ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { priceHour, surface, isActive, name } = body;

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });

    if (!court) {
      return NextResponse.json(
        { success: false, message: "Court not found." },
        { status: 404 }
      );
    }

    // Strict Ownership Check: Must own the venue for this court (or be Admin)
    if (user.role !== "ADMIN" && court.venue.ownerId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          code: "FORBIDDEN",
          message: "Access denied. You do not own this court's venue.",
        },
        { status: 403 }
      );
    }

    const updated = await prisma.court.update({
      where: { id: courtId },
      data: {
        priceHour: priceHour !== undefined ? parseInt(priceHour, 10) : undefined,
        surface: surface !== undefined ? surface : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        name: name ? name.trim() : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Court updated successfully.",
      court: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/owner/courts/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update court." },
      { status: 500 }
    );
  }
}

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
    const courtId = parseInt(id, 10);
    if (isNaN(courtId)) {
      return NextResponse.json(
        { success: false, message: "Invalid court ID." },
        { status: 400 }
      );
    }

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });

    if (!court) {
      return NextResponse.json(
        { success: false, message: "Court not found." },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && court.venue.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. You do not own this court's venue." },
        { status: 403 }
      );
    }

    await prisma.court.delete({
      where: { id: courtId },
    });

    return NextResponse.json({
      success: true,
      message: "Court deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/owner/courts/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete court." },
      { status: 500 }
    );
  }
}

