import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getOrCreatePlayerProfile,
  updatePlayerProfile,
} from "@/lib/matchmaking-engine";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Authentication required to view profile.",
        },
        { status: 401 }
      );
    }

    const profile = await getOrCreatePlayerProfile(authUser.id);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Authentication required to update profile.",
        },
        { status: 401 }
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

    const updatedProfile = await updatePlayerProfile(authUser.id, {
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
      skillLevel: body.skillLevel,
      playingStyle: body.playingStyle,
      playHand: body.playHand,
      preferredDays: body.preferredDays,
      preferredTimeStart: body.preferredTimeStart,
      preferredTimeEnd: body.preferredTimeEnd,
      homeVenueId: body.homeVenueId !== undefined ? (body.homeVenueId ? parseInt(body.homeVenueId, 10) : null) : undefined,
      preferredVenueIds: Array.isArray(body.preferredVenueIds) ? body.preferredVenueIds.map(Number) : undefined,
      bio: body.bio,
      yearsExperience: body.yearsExperience !== undefined ? (body.yearsExperience !== null ? parseInt(body.yearsExperience, 10) : null) : undefined,
      city: body.city,
      district: body.district,
      isProfileComplete: body.isProfileComplete,
    });

    return NextResponse.json({
      success: true,
      message: "Player profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile." },
      { status: 400 }
    );
  }
}
