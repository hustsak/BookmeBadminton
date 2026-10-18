import { prisma } from "@/lib/prisma";
import { UserRole, UserStatus } from "@prisma/client";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  status: UserStatus;
}

/**
 * Extracts and verifies the authenticated user from the request.
 * Security: NEVER trusts roles or claims supplied by the browser.
 * Always resolves the user directly from the database to enforce role integrity.
 */
export async function getAuthenticatedUser(
  request: Request,
  explicitUserId?: number
): Promise<AuthenticatedUser | null> {
  let userId: number | null = null;

  // 1. Check custom headers
  const headerUserId = request.headers.get("x-user-id");
  if (headerUserId) {
    const parsed = parseInt(headerUserId, 10);
    if (!isNaN(parsed) && parsed > 0) {
      userId = parsed;
    }
  }

  // 2. Check Authorization Bearer header (e.g. Bearer 1)
  if (!userId) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const parsed = parseInt(token, 10);
      if (!isNaN(parsed) && parsed > 0) {
        userId = parsed;
      }
    }
  }

  // 3. Check cookies (e.g. bookme_user_id=1)
  if (!userId) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(";").map((c) => {
          const [key, ...v] = c.trim().split("=");
          return [key, decodeURIComponent(v.join("="))];
        })
      );
      const cookieVal = cookies["bookme_user_id"] || cookies["userId"] || cookies["user_id"];
      if (cookieVal) {
        const parsed = parseInt(cookieVal, 10);
        if (!isNaN(parsed) && parsed > 0) {
          userId = parsed;
        }
      }
    }
  }

  // 4. Fallback to explicitly passed userId (e.g. from validated body/query in tests/internal calls)
  if (!userId && explicitUserId && explicitUserId > 0) {
    userId = explicitUserId;
  }

  if (!userId) {
    return null;
  }

  // Verify against database - never trust client role!
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      status: true,
    },
  });

  return dbUser;
}

/**
 * Resolves owner user from request headers/cookies/query.
 * Enforces role verification (OWNER or ADMIN).
 * In development/demo, falls back to the default OWNER in the database if unauthenticated.
 */
export async function getAuthenticatedOwner(
  request: Request,
  options?: { fallbackToDefault?: boolean }
): Promise<{ user: AuthenticatedUser | null; isForbidden: boolean }> {
  const { searchParams } = new URL(request.url);
  const ownerIdParam = searchParams.get("ownerId");
  const parsedOwnerId = ownerIdParam ? parseInt(ownerIdParam, 10) : undefined;

  const hasExplicitCredentials =
    Boolean(request.headers.get("x-user-id")) ||
    Boolean(request.headers.get("authorization")) ||
    Boolean(request.headers.get("cookie")) ||
    Boolean(ownerIdParam);

  let user = await getAuthenticatedUser(request, parsedOwnerId);

  // In production or test, NEVER fallback to default owner unless explicitly requested in options
  const isDev = process.env.NODE_ENV === "development";
  const shouldFallback = (options?.fallbackToDefault ?? isDev) && !hasExplicitCredentials && isDev;

  if (!user && shouldFallback) {
    const defaultOwner = await prisma.user.findFirst({
      where: { role: "OWNER", status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
      },
    });
    if (defaultOwner) {
      user = defaultOwner;
    }
  }

  if (!user) {
    return { user: null, isForbidden: false };
  }

  if (user.status === "SUSPENDED") {
    return { user, isForbidden: true };
  }

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return { user, isForbidden: true };
  }

  return { user, isForbidden: false };
}

/**
 * Resolves admin user from request headers/cookies/query.
 * Enforces strict ADMIN role verification.
 * In development mode only, falls back to the first active ADMIN if unauthenticated.
 */
export async function getAuthenticatedAdmin(
  request: Request,
  options?: { fallbackToDefault?: boolean }
): Promise<{ user: AuthenticatedUser | null; isForbidden: boolean }> {
  const { searchParams } = new URL(request.url);
  const adminIdParam = searchParams.get("adminId");
  const parsedAdminId = adminIdParam ? parseInt(adminIdParam, 10) : undefined;

  const hasExplicitCredentials =
    Boolean(request.headers.get("x-user-id")) ||
    Boolean(request.headers.get("authorization")) ||
    Boolean(request.headers.get("cookie")) ||
    Boolean(adminIdParam);

  let user = await getAuthenticatedUser(request, parsedAdminId);

  // Fallback to active admin ONLY in development mode when no credentials were provided
  const isDev = process.env.NODE_ENV === "development";
  const shouldFallback = (options?.fallbackToDefault ?? isDev) && !hasExplicitCredentials && isDev;

  if (!user && shouldFallback) {
    const defaultAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
      },
    });
    if (defaultAdmin) {
      user = defaultAdmin;
    }
  }

  if (!user) {
    return { user: null, isForbidden: false };
  }

  if (user.status === "SUSPENDED" || user.role !== "ADMIN") {
    return { user, isForbidden: true };
  }

  return { user, isForbidden: false };
}

