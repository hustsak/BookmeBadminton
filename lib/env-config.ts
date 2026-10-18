/**
 * Production Environment Configuration & Startup Validation
 * Validates critical environment settings at startup without leaking secrets.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateServerEnv(options: { strict?: boolean } = {}): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";

  // 1. Database URL check
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === "") {
    errors.push("DATABASE_URL is missing or empty. A valid PostgreSQL connection string is required.");
  } else if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    errors.push("DATABASE_URL must start with 'postgresql://' or 'postgres://'.");
  }

  // 2. Production-specific checks
  if (isProduction) {
    // CRON_SECRET is required to prevent public abuse of /api/cron/reminders
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.trim() === "") {
      errors.push("CRON_SECRET is required in production to authorize scheduled jobs.");
    } else if (cronSecret.length < 16) {
      warnings.push("CRON_SECRET is shorter than 16 characters. A longer, cryptographically random secret is recommended.");
    }

    // App URL validation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      warnings.push("NEXT_PUBLIC_APP_URL is not set. Canonical links and PWA manifest may use relative defaults.");
    } else if (!appUrl.startsWith("https://")) {
      warnings.push("NEXT_PUBLIC_APP_URL does not use HTTPS. Production deployments require HTTPS for PWA and secure cookies.");
    }
  }

  const valid = errors.length === 0;

  if (options.strict && !valid) {
    throw new Error(`[Configuration Error] Critical production environment check failed:\n- ${errors.join("\n- ")}`);
  }

  return { valid, errors, warnings };
}
