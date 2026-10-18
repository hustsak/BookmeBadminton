import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerIdParam = searchParams.get("ownerId");

    let ownerId = ownerIdParam ? parseInt(ownerIdParam, 10) : undefined;

    // Default to first owner if not specified in demo environment
    if (!ownerId) {
      const defaultOwner = await prisma.user.findFirst({
        where: { role: "OWNER" },
      });
      ownerId = defaultOwner?.id;
    }

    if (!ownerId) {
      return NextResponse.json(
        { success: false, message: "No venue owner found." },
        { status: 404 }
      );
    }

    const venues = await prisma.venue.findMany({
      where: { ownerId },
      include: {
        courts: {
          include: {
            maintenanceBlocks: {
              orderBy: { date: "desc" },
            },
          },
          orderBy: { name: "asc" },
        },
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      ownerId,
      venues,
    });
  } catch (error: any) {
    console.error("GET /api/owner/venues error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch owner venues." },
      { status: 500 }
    );
  }
}
