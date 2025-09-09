import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { generateKeyId, generateSecret, formatLicense, hashSecret } from "@/lib/license";
import { z } from "zod";
import { sendLicenseEmail } from "@/lib/mailer";

export const runtime = "nodejs"; // argon2使用のためNode実行

const Body = z.object({
  email: z.string().email(),
  plan: z.string().default("basic"),
  activationLimit: z.number().int().min(1).max(10).default(1),
});

export async function POST(req: NextRequest) {
  const admin = req.headers.get("x-admin-token");
  if (admin !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json();
  const { email, plan, activationLimit } = Body.parse(json);

  const keyId = generateKeyId();
  const secret = generateSecret();
  const fullKey = formatLicense(keyId, secret);
  const secretHash = await hashSecret(secret);

  // デバッグ情報を出力
  console.log('=== ライセンスキー発行（デバッグ） ===');
  console.log('Key ID:', keyId);
  console.log('Secret:', secret);
  console.log('Full License Key:', fullKey);
  console.log('Secret Hash:', secretHash);
  console.log('=====================================');

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
  const licRef = await db.collection("licenses").add({
    email,
    keyId,
    secretHash,
    plan,
    activationLimit,
    status: "UNCLAIMED",
    activationCount: 0,
    createdAt: new Date(),
  });

  await sendLicenseEmail(email, fullKey);

  return NextResponse.json({ ok: true, licenseId: licRef.id });
}
