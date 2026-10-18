import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isTest =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  process.argv.some(
    (arg) => arg.includes(".test.ts") || arg.includes("tests/") || arg.includes("test")
  );

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isTest ? [] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}