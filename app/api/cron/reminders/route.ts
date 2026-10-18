import { NextResponse } from "next/server";
import { processReminders } from "@/lib/reminder-service";

/**
 * Scheduled job entry point for booking and match reminders.
 * Can be triggered periodically (e.g. every 15-30 minutes) by hosting provider cron
 * services (e.g., Vercel Cron, Google Cloud Scheduler, GitHub Actions, or node-cron).
 *
 * Security:
 * If CRON_SECRET is configured in environment variables, requests must supply
 * `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
 */
async function handleReminders(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    if (cronSecret || isProd) {
      const authHeader = request.headers.get("authorization");
      const xSecret = request.headers.get("x-cron-secret");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7).trim()
        : xSecret;

      if (!cronSecret || token !== cronSecret) {
        return NextResponse.json(
          { success: false, message: "Unauthorized cron execution." },
          { status: 401 }
        );
      }
    }

    // Optional referenceTime parameter for testing/simulating reminder windows
    const { searchParams } = new URL(request.url);
    const refParam = searchParams.get("referenceTime");
    let referenceTime: Date = new Date();
    if (refParam) {
      const parsed = new Date(refParam);
      if (!isNaN(parsed.getTime())) {
        referenceTime = parsed;
      }
    }

    const result = await processReminders(referenceTime);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      referenceTime: referenceTime.toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("Cron reminders error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to process reminder job.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleReminders(request);
}

export async function GET(request: Request) {
  return handleReminders(request);
}
