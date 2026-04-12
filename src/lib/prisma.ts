import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase dùng PgBouncer transaction mode — prepared statements không tồn tại
// giữa các connections. Tắt cache để tránh lỗi "prepared statement does not exist".
function buildUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const sep = raw.includes("?") ? "&" : "?";
  // Tránh thêm trùng param nếu đã có
  if (raw.includes("pgbouncer=true")) return raw;
  return `${raw}${sep}pgbouncer=true&statement_cache_size=0`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: { url: buildUrl(process.env.DATABASE_URL) },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
