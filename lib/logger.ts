/**
 * Production-Safe Structured Logger
 * Emits structured JSON in production with automatic redaction of sensitive credentials and PII.
 */

type LogLevel = "info" | "warn" | "error" | "audit";

interface LogMetadata {
  correlationId?: string;
  bookingId?: number | string;
  userId?: number | string;
  venueId?: number | string;
  courtId?: number | string;
  matchId?: number | string;
  path?: string;
  method?: string;
  action?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "creditcard",
  "cardnumber",
  "cvv",
  "pin",
  "apikey",
  "cronsecret",
  "database_url",
]);

function sanitizeValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;

  const lowerKey = key.toLowerCase();
  for (const sensitive of SENSITIVE_KEYS) {
    if (lowerKey.includes(sensitive)) {
      return "[REDACTED]";
    }
  }

  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(key, item));
    }
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitizedObj[k] = sanitizeValue(k, v);
    }
    return sanitizedObj;
  }

  return value;
}

function emitLog(level: LogLevel, message: string, meta?: LogMetadata, err?: unknown): void {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const timestamp = new Date().toISOString();

    const sanitizedMeta = meta
      ? (sanitizeValue("meta", meta) as Record<string, unknown>)
      : undefined;

    let errorDetails: { message: string; name?: string; stack?: string } | undefined;
    if (err instanceof Error) {
      errorDetails = {
        name: err.name,
        message: err.message,
        // In production, keep stack in server logs for debugging, but never send to client
        stack: err.stack,
      };
    } else if (err) {
      errorDetails = { message: String(err) };
    }

    if (isProd) {
      const payload = {
        timestamp,
        level,
        message,
        ...sanitizedMeta,
        ...(errorDetails ? { error: errorDetails } : {}),
      };
      const output = JSON.stringify(payload);
      if (level === "error") {
        console.error(output);
      } else if (level === "warn") {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const metaStr = meta ? ` | ${JSON.stringify(sanitizedMeta)}` : "";
      const errStr = errorDetails ? ` | Error: ${errorDetails.message}` : "";
      const prefix = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      if (level === "error") {
        console.error(prefix + metaStr + errStr);
      } else if (level === "warn") {
        console.warn(prefix + metaStr + errStr);
      } else {
        console.log(prefix + metaStr);
      }
    }
  } catch {
    // Fail silently: logging failure must never crash customer transactions
  }
}

export const logger = {
  info: (message: string, meta?: LogMetadata) => emitLog("info", message, meta),
  warn: (message: string, meta?: LogMetadata, err?: unknown) => emitLog("warn", message, meta, err),
  error: (message: string, meta?: LogMetadata, err?: unknown) => emitLog("error", message, meta, err),
  audit: (action: string, meta?: LogMetadata) => emitLog("audit", `[AUDIT] ${action}`, { action, ...meta }),
};
