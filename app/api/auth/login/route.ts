import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "USER_NOT_FOUND",
          message: "No account found with this email. Please register first.",
        },
        { status: 404 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message: `Account is suspended. Reason: ${user.suspensionReason || "Violation of terms."}`,
        },
        { status: 403 }
      );
    }

    let redirectTo = "/";
    if (user.role === "OWNER") {
      redirectTo = "/owner";
    } else if (user.role === "ADMIN") {
      redirectTo = "/admin";
    }

    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      redirectTo,
    });

    response.cookies.set("bookme_user_id", String(user.id), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sign in." },
      { status: 500 }
    );
  }
}
