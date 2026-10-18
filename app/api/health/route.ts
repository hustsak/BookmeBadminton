import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Verifies application liveness and PostgreSQL database connectivity.
 * Safe for automated monitoring, uptime checks, and load balancer probes.
 * Never exposes credentials, database hostnames, or internal stack traces.
 */
export async function GET() {
  const startTime = Date.now();
  const uptimeSeconds = Math.floor(process.uptime());

  let databaseStatus: "connected" | "disconnected" = "disconnected";
  let databaseLatencyMs = 0;
  let isHealthy = false;

  try {
    const dbStart = Date.now();
    // Lightweight database ping: SELECT 1
    await prisma.$queryRaw`SELECT 1`;
    databaseLatencyMs = Date.now() - dbStart;
    databaseStatus = "connected";
    isHealthy = true;
  } catch {
    databaseStatus = "disconnected";
    isHealthy = false;
  }

  const responseBody = {
    status: isHealthy ? "ok" : "degraded",
    liveness: "alive",
    readiness: isHealthy ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    checks: {
      server: "healthy",
      database: {
        status: databaseStatus,
        latencyMs: databaseStatus === "connected" ? databaseLatencyMs : null,
      },
    },
    totalLatencyMs: Date.now() - startTime,
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
