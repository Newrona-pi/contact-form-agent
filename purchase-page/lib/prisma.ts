import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function prepareTmpSqliteIfNeeded(): void {
  const useTmp = process.env.USE_TMP_SQLITE === "1" || process.env.USE_TMP_SQLITE === "true";
  const isVercel = !!process.env.VERCEL;
  if (!useTmp || !isVercel) return;

  try {
    const src = path.resolve(process.cwd(), "prisma", "dev.db");
    const dst = path.posix.join("/tmp", "purchase-page-dev.db");

    if (!fs.existsSync(dst)) {
      const buf = fs.readFileSync(src);
      fs.writeFileSync(dst, buf);
    }

    process.env.DATABASE_URL = `file:${dst}`;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[purchase-page] tmp sqlite preparation skipped:", e);
  }
}

prepareTmpSqliteIfNeeded();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
