import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
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

  const licSnap = await db.collection("licenses").where("keyId", "==", keyId).limit(1).get();
  if (licSnap.empty) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const licRef = licSnap.docs[0].ref;
  const lic = licSnap.docs[0].data();
  if (lic.email.toLowerCase() !== email.toLowerCase()) {
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

  await db.runTransaction(async (t) => {
    const snap = await t.get(licRef);
    const data = snap.data()!;
    t.update(licRef, {
      status: data.status === "UNCLAIMED" ? "ACTIVE" : data.status,
      activationCount: FieldValue.increment(1),
      claimedAt: data.claimedAt ?? new Date(),
    });
    t.set(db.collection("activations").doc(), {
      licenseId: licRef.id,
      device: device ?? null,
      ipHash: crypto.createHash("sha256").update(req.ip ?? "").digest("hex"),
      userAgent: req.headers.get("user-agent") ?? undefined,
      createdAt: new Date(),
    });
  });

  const access = await createAccessToken({ sub: licRef.id, email: lic.email, plan: lic.plan }, "30m");

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
