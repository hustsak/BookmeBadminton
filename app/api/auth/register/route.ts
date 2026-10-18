import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, role, phone, clubName, clubAddress } = body;

    // 1. Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    // Role normalization & strict validation
    const rawRole = (role || "").toString().trim().toUpperCase();

    // SECURITY: Public registration must NEVER be able to create an ADMIN account
    if (rawRole === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          code: "FORBIDDEN_ROLE",
          message: "Registration as Admin is strictly prohibited. Choose Player or Club Owner.",
        },
        { status: 400 }
      );
    }

    let userRole: UserRole;
    if (rawRole === "OWNER" || rawRole === "CLUB_OWNER" || rawRole === "CLUB OWNER") {
      userRole = UserRole.OWNER;
    } else if (rawRole === "CUSTOMER" || rawRole === "PLAYER" || rawRole === "USER") {
      userRole = UserRole.CUSTOMER;
    } else {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_ROLE",
          message: "A valid role is required. Please select either 'Player' or 'Club Owner'.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_EXISTS",
          message: "An account with this email address already exists. Please sign in.",
        },
        { status: 409 }
      );
    }

    // Create user in transaction with appropriate initial profile or club
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          role: userRole,
          phone: phone ? phone.trim() : null,
          status: "ACTIVE",
        },
      });

      if (userRole === UserRole.CUSTOMER) {
        // Create initial player profile
        await tx.playerProfile.create({
          data: {
            userId: user.id,
            displayName: user.name,
            skillLevel: "INTERMEDIATE",
            playingStyle: "BOTH",
            playHand: "RIGHT",
            isProfileComplete: true,
          },
        });
      } else if (userRole === UserRole.OWNER) {
        // Create initial club venue for court owner
        const venueName = (clubName && clubName.trim()) || `${user.name}'s Badminton Club`;
        const address = (clubAddress && clubAddress.trim()) || "Hanoi";

        await tx.venue.create({
          data: {
            name: venueName,
            location: address,
            address: address,
            description: `Welcome to ${venueName}! Premium badminton courts open for booking.`,
            openTime: "06:00",
            closeTime: "23:00",
            ownerId: user.id,
            courts: {
              create: [
                { name: "Court 01", priceHour: 100000, surface: "Taraflex Pro Turf" },
                { name: "Court 02", priceHour: 100000, surface: "Taraflex Pro Turf" },
              ],
            },
          },
        });
      }

      return user;
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Registration completed successfully.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
        },
        redirectTo: newUser.role === UserRole.OWNER ? "/owner" : "/",
      },
      { status: 201 }
    );

    // Set HTTP session cookie
    response.cookies.set("bookme_user_id", String(newUser.id), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "lax",
      httpOnly: false, // Accessible to client-side auth helpers
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to register account." },
      { status: 500 }
    );
  }
}
