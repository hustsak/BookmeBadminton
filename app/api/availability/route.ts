import { NextResponse } from "next/server";
import { getCourtAvailability, ValidationError, NotFoundError } from "@/lib/booking-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courtIdParam = searchParams.get("courtId");
    const dateParam = searchParams.get("date");

    if (!courtIdParam || !dateParam) {
      return NextResponse.json(
        {
          success: false,
          message: "Both 'courtId' and 'date' query parameters are required.",
        },
        { status: 400 }
      );
    }

    const courtId = parseInt(courtIdParam, 10);
    if (isNaN(courtId) || courtId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid courtId parameter.",
        },
        { status: 400 }
      );
    }

    const availability = await getCourtAvailability(courtId, dateParam);

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    console.error("Availability API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve court availability. Please try again.",
      },
      { status: 500 }
    );
  }
}
