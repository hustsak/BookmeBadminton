import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        courts: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      venues,
    });
  } catch (error: any) {
    console.error("GET /api/venues error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch venues." },
      { status: 500 }
    );
  }
}
