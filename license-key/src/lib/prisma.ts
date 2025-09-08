import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function prepareTmpSqliteIfNeeded(): void {
  const useTmp = process.env.USE_TMP_SQLITE === "1" || process.env.USE_TMP_SQLITE === "true";
  const isVercel = !!process.env.VERCEL;
  if (!useTmp || !isVercel) return;

  try {
    const src = path.resolve(process.cwd(), "prisma", "dev.db");
    const dst = path.posix.join("/tmp", "license-key-dev.db");

    // 初回のみ /tmp にコピー（存在しない場合）
    if (!fs.existsSync(dst)) {
      const buf = fs.readFileSync(src);
      fs.writeFileSync(dst, buf);
    }

    // Prisma が参照する DATABASE_URL を /tmp に向ける
    process.env.DATABASE_URL = `file:${dst}`;
  } catch (e) {
    // 失敗しても落とさない（ローカルなど）
    // eslint-disable-next-line no-console
    console.warn("[license-key] tmp sqlite preparation skipped:", e);
  }
}

prepareTmpSqliteIfNeeded();

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
