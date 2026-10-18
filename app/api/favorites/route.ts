import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getUserFavorites,
  toggleUserFavorite,
  removeUserFavorite,
  FavoriteValidationError,
  FavoriteNotFoundError,
} from "@/lib/favorites-engine";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to view your saved favorites.",
          count: 0,
          venueIds: [],
          favorites: [],
        },
        { status: 401 }
      );
    }

    const data = await getUserFavorites(authUser.id);

    return NextResponse.json({
      success: true,
      count: data.count,
      venueIds: data.venueIds,
      favorites: data.favorites,
    });
  } catch (error: any) {
    if (error instanceof FavoriteValidationError) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof FavoriteNotFoundError) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }
    console.error("GET /api/favorites error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve favorites." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
          message: "Please sign in to save or remove favorite courts.",
        },
        { status: 401 }
      );
    }

    const venueId = parseInt(body.venueId, 10);
    if (isNaN(venueId) || venueId <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid numeric venue ID is required." },
        { status: 400 }
      );
    }

    if (body.action === "remove") {
      const result = await removeUserFavorite(authUser.id, venueId);
      return NextResponse.json({
        success: true,
        isFavorite: false,
        count: result.count,
        venueId: result.venueId,
        message: "Removed from favorites.",
      });
    }

    const result = await toggleUserFavorite(authUser.id, venueId);

    return NextResponse.json({
      success: true,
      isFavorite: result.isFavorite,
      count: result.count,
      venueId: result.venueId,
      message: result.isFavorite
        ? `Added ${result.venueName} to favorites!`
        : `Removed ${result.venueName} from favorites.`,
    });
  } catch (error: any) {
    if (error instanceof FavoriteValidationError) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof FavoriteNotFoundError) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }
    console.error("POST /api/favorites error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update favorites." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueIdParam = searchParams.get("venueId");

    let venueId = venueIdParam ? parseInt(venueIdParam, 10) : NaN;
    let explicitUserId: number | undefined;

    if (isNaN(venueId)) {
      try {
        const body = await request.json();
        venueId = parseInt(body.venueId, 10);
        explicitUserId = body.userId;
      } catch {
        // quiet
      }
    }

    if (isNaN(venueId) || venueId <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid numeric venue ID is required." },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser(request, explicitUserId);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to modify favorites.",
        },
        { status: 401 }
      );
    }

    const result = await removeUserFavorite(authUser.id, venueId);

    return NextResponse.json({
      success: true,
      isFavorite: false,
      count: result.count,
      venueId: result.venueId,
      message: "Venue removed from favorites.",
    });
  } catch (error: any) {
    console.error("DELETE /api/favorites error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove favorite." },
      { status: 500 }
    );
  }
}
