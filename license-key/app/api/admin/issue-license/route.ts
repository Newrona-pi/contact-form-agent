import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { generateKeyId, generateSecret, formatLicense, hashSecret } from "@/lib/license";
import { sendLicenseEmail } from "@/lib/mailer";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const issueLicenseSchema = z.object({
  email: z.string().email(),
  plan: z.string().default("basic"),
  activationLimit: z.number().min(1).default(1),
  expiresAt: z.string().optional(), // ISO string
});

export async function POST(request: NextRequest) {
  try {
    // 管理者認証
    const adminToken = request.headers.get("x-admin-token");
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { email, plan, activationLimit, expiresAt } = issueLicenseSchema.parse(body);

    const db = getDb();

    // ライセンスキー生成
    const keyId = generateKeyId();
    const secret = generateSecret();
    const fullLicenseKey = formatLicense(keyId, secret);
    const secretHash = await hashSecret(secret);

    // 期限の設定
    const expiresAtTimestamp = expiresAt ? new Date(expiresAt) : null;

    // ライセンス作成
    const licenseData = {
      email,
      keyId,
      secretHash,
      plan,
      status: "UNCLAIMED",
      activationLimit,
      activationCount: 0,
      expiresAt: expiresAtTimestamp,
      claimedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const licenseRef = await db.collection("licenses").add(licenseData);
    const licenseId = licenseRef.id;

    // 管理者ログ記録
    await db.collection("adminLogs").add({
      action: "ISSUE_LICENSE",
      licenseId,
      email,
      details: `ライセンス発行: ${plan}プラン, アクティベーション制限: ${activationLimit}`,
      adminId: "system", // 実際の実装では認証された管理者IDを使用
      createdAt: FieldValue.serverTimestamp(),
    });

    // メール送信
    try {
      await sendLicenseEmail(email, fullLicenseKey);
    } catch (emailError) {
      console.error("メール送信エラー:", emailError);
      // メール送信に失敗してもライセンス発行は成功とする
    }

    return NextResponse.json({
      success: true,
      licenseId,
      keyId: fullLicenseKey,
      message: "ライセンスが正常に発行されました",
    });

  } catch (error) {
    console.error("ライセンス発行エラー:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "入力データが無効です", 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: "ライセンス発行に失敗しました" 
    }, { status: 500 });
  }
}
