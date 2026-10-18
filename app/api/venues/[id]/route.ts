import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    let numericId = parseInt(id, 10);

    let venue = null;
    if (!isNaN(numericId)) {
      venue = await prisma.venue.findUnique({
        where: { id: numericId },
        include: {
          courts: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
          owner: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Fallback mapping for legacy mock venue IDs 1, 2, 3
    if (!venue) {
      if (id === "1") {
        venue = await prisma.venue.findFirst({
          where: { name: "Smash Arena" },
          include: { courts: { where: { isActive: true }, orderBy: { name: "asc" } }, owner: { select: { id: true, name: true } } },
        });
      } else if (id === "2") {
        venue = await prisma.venue.findFirst({
          where: { name: { in: ["Victory Club", "Victory Badminton Club"] } },
          include: { courts: { where: { isActive: true }, orderBy: { name: "asc" } }, owner: { select: { id: true, name: true } } },
        });
      } else if (id === "3") {
        venue = await prisma.venue.findFirst({
          where: { name: "Pro Court" },
          include: { courts: { where: { isActive: true }, orderBy: { name: "asc" } }, owner: { select: { id: true, name: true } } },
        });
      }
    }

    if (!venue) {
      // First available venue fallback
      venue = await prisma.venue.findFirst({
        include: { courts: { where: { isActive: true }, orderBy: { name: "asc" } }, owner: { select: { id: true, name: true } } },
      });
    }

    if (!venue) {
      return NextResponse.json(
        { success: false, message: "Venue not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      venue,
    });
  } catch (error: any) {
    console.error("GET /api/venues/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve venue." },
      { status: 500 }
    );
  }
}
