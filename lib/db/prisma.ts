import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Parse local SQLite file path from environment variables
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbPath = dbUrl.replace(/^file:/, "");

// Instantiate the Prisma 7 BetterSqlite3 adapter directly by passing the file path configuration
const adapter = new PrismaBetterSqlite3({
  url: dbPath,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
