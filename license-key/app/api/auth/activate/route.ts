import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLicense, verifySecret } from "@/lib/license";
import { createAccessToken } from "@/lib/jwt";
import { z } from "zod";
import crypto from "crypto";

export const runtime = "nodejs"; // argon2使用のためNode実行

const Body = z.object({
  email: z.string().email(),
  licenseKey: z.string().min(8),
  device: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { email, licenseKey, device } = Body.parse(await req.json());

  // デバッグ情報を出力
  console.log('=== ライセンス認証（デバッグ） ===');
  console.log('Email:', email);
  console.log('License Key:', licenseKey);
  console.log('Device:', device);

  let keyId: string, secret: string;
  try { ({ keyId, secret } = parseLicense(licenseKey)); }
  catch { 
    console.log('License parsing failed');
    return NextResponse.json({ error: "INVALID_LICENSE" }, { status: 400 }); 
  }

  console.log('Parsed Key ID:', keyId);
  console.log('Parsed Secret:', secret);

  const lic = await prisma.license.findUnique({ where: { keyId } });
  if (!lic || lic.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (lic.status === "REVOKED" || lic.status === "EXPIRED") {
    return NextResponse.json({ error: lic.status }, { status: 403 });
  }
  if (!(await verifySecret(lic.secretHash, secret))) {
    return NextResponse.json({ error: "INVALID_LICENSE" }, { status: 403 });
  }

  // アクティベーション制御（開発環境では無効化）
  // if (lic.activationCount >= lic.activationLimit) {
  //   return NextResponse.json({ error: "ACTIVATION_LIMIT" }, { status: 403 });
  // }

  await prisma.$transaction([
    prisma.license.update({
      where: { id: lic.id },
      data: {
        status: lic.status === "UNCLAIMED" ? "ACTIVE" : lic.status,
        activationCount: { increment: 1 },
        claimedAt: lic.claimedAt ?? new Date(),
      },
    }),
    prisma.activation.create({
      data: {
        licenseId: lic.id,
        device: device ?? null,
        ipHash: crypto.createHash("sha256").update(req.ip ?? "").digest("hex"),
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }),
  ]);

  const access = await createAccessToken({ sub: lic.id, email: lic.email, plan: lic.plan }, "30m");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}
