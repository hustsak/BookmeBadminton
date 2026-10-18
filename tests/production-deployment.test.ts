/**
 * Phase 10: Production Deployment, Monitoring & Safe Release Tests
 * Tests health endpoints, environment validation, logger redaction, security headers, and deployment assets.
 */

import { GET as getHealth } from "../app/api/health/route";
import { validateServerEnv } from "../lib/env-config";
import { logger } from "../lib/logger";
import nextConfig from "../next.config";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("==========================================================");
  console.log("🚀 BOOKMEBADMINTON PHASE 10: DEPLOYMENT & RELEASE TESTS 🚀");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`• Testing: ${name}... ✅ PASSED`);
      passed++;
    } else {
      console.error(`• Testing: ${name}... ❌ FAILED`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Health Check Endpoint (/api/health)
  // -------------------------------------------------------------
  try {
    const response = await getHealth();
    assert(response.status === 200, "1.1: Health check returns HTTP 200 status");

    const data = await response.json();
    assert(data.status === "ok", "1.2: Health check reports status 'ok'");
    assert(data.liveness === "alive", "1.3: Health check reports liveness 'alive'");
    assert(data.readiness === "ready", "1.4: Health check reports readiness 'ready'");
    assert(data.checks?.database?.status === "connected", "1.5: Database check reports 'connected'");
    assert(typeof data.checks?.database?.latencyMs === "number", "1.6: Database latency is reported as a number");
    assert(!JSON.stringify(data).includes("postgresql://"), "1.7: Health check never leaks database connection credentials");
    assert(response.headers.get("cache-control")?.includes("no-store") === true, "1.8: Health response disables caching");
  } catch (err) {
    assert(false, `1.x: Health check failed with error: ${(err as Error).message}`);
  }

  // -------------------------------------------------------------
  // Test 2: Production Environment Validation (lib/env-config.ts)
  // -------------------------------------------------------------
  try {
    // Save current env
    const origDb = process.env.DATABASE_URL;
    const origCron = process.env.CRON_SECRET;
    const origNodeEnv = process.env.NODE_ENV;
    const origAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Test with missing DATABASE_URL
    delete process.env.DATABASE_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const resNoDb = validateServerEnv();
    assert(!resNoDb.valid && resNoDb.errors.some(e => e.includes("DATABASE_URL")), "2.1: Missing DATABASE_URL fails validation");

    // Test with invalid DATABASE_URL protocol
    process.env.DATABASE_URL = "mysql://invalid-db";
    const resInvalidProto = validateServerEnv();
    assert(!resInvalidProto.valid && resInvalidProto.errors.some(e => e.includes("postgresql://")), "2.2: Invalid DATABASE_URL protocol fails validation");

    // Test with missing CRON_SECRET in production
    process.env.DATABASE_URL = origDb;
    delete process.env.CRON_SECRET;
    const resNoCron = validateServerEnv();
    assert(!resNoCron.valid && resNoCron.errors.some(e => e.includes("CRON_SECRET")), "2.3: Missing CRON_SECRET in production fails validation");

    // Test with non-HTTPS NEXT_PUBLIC_APP_URL in production
    process.env.CRON_SECRET = "production_secure_cron_secret_123456789";
    process.env.NEXT_PUBLIC_APP_URL = "http://insecure-http-url.com";
    const resHttpWarn = validateServerEnv();
    assert(resHttpWarn.warnings.some(w => w.includes("HTTPS")), "2.4: Non-HTTPS app URL produces production warning");

    // Test with valid production env
    process.env.NEXT_PUBLIC_APP_URL = "https://badminton.bookme.vn";
    const resValid = validateServerEnv();
    assert(resValid.valid && resValid.errors.length === 0, "2.5: Valid production configuration passes validation");

    // Restore env
    process.env.DATABASE_URL = origDb;
    process.env.CRON_SECRET = origCron;
    (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    process.env.NEXT_PUBLIC_APP_URL = origAppUrl;
  } catch (err) {
    assert(false, `2.x: Env validation test error: ${(err as Error).message}`);
  }

  // -------------------------------------------------------------
  // Test 3: Structured Logger Redaction (lib/logger.ts)
  // -------------------------------------------------------------
  try {
    let capturedLog = "";
    const origLog = console.log;
    console.log = (msg: string) => { capturedLog += msg; };

    logger.info("User booking action recorded", {
      bookingId: 42,
      userId: 7,
      password: "SuperSecretPassword123",
      apiKey: "secret_api_key_abc",
      authorization: "Bearer secret-token-xyz",
    });

    console.log = origLog;

    assert(!capturedLog.includes("SuperSecretPassword123"), "3.1: Logger redacts password field");
    assert(!capturedLog.includes("secret_api_key_abc"), "3.2: Logger redacts apiKey field");
    assert(!capturedLog.includes("secret-token-xyz"), "3.3: Logger redacts authorization header");
    assert(capturedLog.includes("[REDACTED]"), "3.4: Logger replaces sensitive data with [REDACTED]");
    assert(capturedLog.includes("42"), "3.5: Logger preserves harmless correlation identifiers like bookingId");
  } catch (err) {
    assert(false, `3.x: Logger test error: ${(err as Error).message}`);
  }

  // -------------------------------------------------------------
  // Test 4: Security Headers Configuration (next.config.ts)
  // -------------------------------------------------------------
  try {
    const configHeaders = typeof nextConfig.headers === "function" ? await nextConfig.headers() : [];
    const rootHeaderConfig = configHeaders.find(h => h.source === "/:path*");

    assert(rootHeaderConfig !== undefined, "4.1: Security headers rule exists for all paths (/:path*)");

    const headerKeys = rootHeaderConfig?.headers.map(h => h.key) || [];
    assert(headerKeys.includes("Strict-Transport-Security"), "4.2: Strict-Transport-Security header is configured");
    assert(headerKeys.includes("X-Frame-Options"), "4.3: X-Frame-Options header is configured");
    assert(headerKeys.includes("X-Content-Type-Options"), "4.4: X-Content-Type-Options header is configured");
    assert(headerKeys.includes("Referrer-Policy"), "4.5: Referrer-Policy header is configured");
    assert(headerKeys.includes("Permissions-Policy"), "4.6: Permissions-Policy header is configured");

    const frameOptions = rootHeaderConfig?.headers.find(h => h.key === "X-Frame-Options")?.value;
    assert(frameOptions === "SAMEORIGIN", "4.7: X-Frame-Options is set to SAMEORIGIN");
  } catch (err) {
    assert(false, `4.x: Security headers test error: ${(err as Error).message}`);
  }

  // -------------------------------------------------------------
  // Test 5: Deployment Files & CI/CD Pipeline
  // -------------------------------------------------------------
  try {
    const rootDir = path.resolve(__dirname, "..");

    const dockerfilePath = path.join(rootDir, "Dockerfile");
    assert(fs.existsSync(dockerfilePath), "5.1: Production Dockerfile exists");
    const dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");
    assert(dockerfileContent.includes("node:20-alpine") && dockerfileContent.includes("prisma generate"), "5.2: Dockerfile uses Node 20 and runs prisma generate");

    const dockerignorePath = path.join(rootDir, ".dockerignore");
    assert(fs.existsSync(dockerignorePath), "5.3: .dockerignore exists");

    const vercelConfigPath = path.join(rootDir, "vercel.json");
    assert(fs.existsSync(vercelConfigPath), "5.4: vercel.json exists");
    const vercelContent = fs.readFileSync(vercelConfigPath, "utf-8");
    assert(vercelContent.includes("/api/cron/reminders"), "5.5: vercel.json defines reminder cron schedule");

    const ciWorkflowPath = path.join(rootDir, ".github", "workflows", "ci.yml");
    assert(fs.existsSync(ciWorkflowPath), "5.6: GitHub Actions CI/CD workflow exists");
    const ciContent = fs.readFileSync(ciWorkflowPath, "utf-8");
    assert(ciContent.includes("prisma migrate deploy") && ciContent.includes("npm run build"), "5.7: CI workflow executes migrations and production build");
  } catch (err) {
    assert(false, `5.x: Deployment files test error: ${(err as Error).message}`);
  }

  // -------------------------------------------------------------
  // Test 6: Database Backup & Restore Script Integrity
  // -------------------------------------------------------------
  try {
    const rootDir = path.resolve(__dirname, "..");
    const backupScript = path.join(rootDir, "scripts", "backup-db.sh");
    const restoreScript = path.join(rootDir, "scripts", "restore-db.sh");

    assert(fs.existsSync(backupScript), "6.1: Database backup script exists");
    const backupContent = fs.readFileSync(backupScript, "utf-8");
    assert(backupContent.includes("pg_dump") && backupContent.includes("--compress"), "6.2: Backup script uses compressed pg_dump");

    assert(fs.existsSync(restoreScript), "6.3: Database restore script exists");
    const restoreContent = fs.readFileSync(restoreScript, "utf-8");
    assert(restoreContent.includes("pg_restore") && restoreContent.includes("CONFIRM"), "6.4: Restore script requires explicit confirmation before execution");
  } catch (err) {
    assert(false, `6.x: Backup scripts test error: ${(err as Error).message}`);
  }

  console.log("\n==========================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
