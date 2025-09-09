import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { signJWT } from "@/lib/jwt";
import { z } from "zod";

const activateSchema = z.object({
  email: z.string().email(),
  licenseKey: z.string().min(1),
  device: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, licenseKey, device, userAgent } = activateSchema.parse(body);

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
    }

    // ライセンス検索
    const licensesSnapshot = await db
      .collection("licenses")
      .where("keyId", "==", licenseKey)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (licensesSnapshot.empty) {
      return NextResponse.json({ 
        error: "ライセンスキーまたはメールアドレスが正しくありません" 
      }, { status: 404 });
    }

    const licenseDoc = licensesSnapshot.docs[0];
    const licenseData = licenseDoc.data();
    const licenseId = licenseDoc.id;

    // ライセンスステータスチェック
    if (licenseData.status !== "UNCLAIMED" && licenseData.status !== "ACTIVE") {
      return NextResponse.json({ 
        error: "このライセンスは使用できません" 
      }, { status: 400 });
    }

    // 期限チェック
    if (licenseData.expiresAt && new Date(licenseData.expiresAt.toDate()) < new Date()) {
      return NextResponse.json({ 
        error: "ライセンスの有効期限が切れています" 
      }, { status: 400 });
    }

    // アクティベーション制限チェック
    if (licenseData.activationCount >= licenseData.activationLimit) {
      return NextResponse.json({ 
        error: "アクティベーション制限に達しています" 
      }, { status: 400 });
    }

    // IPアドレスのハッシュ化
    const clientIP = request.headers.get("x-forwarded-for") || 
                    request.headers.get("x-real-ip") || 
                    "unknown";
    const ipHash = await hashIP(clientIP);

    // アクティベーション記録作成
    await db.collection("activations").add({
      licenseId,
      device: device || "unknown",
      ipHash,
      userAgent: userAgent || "unknown",
      createdAt: new Date(),
    });

    // ライセンス更新
    const updateData: any = {
      activationCount: licenseData.activationCount + 1,
      updatedAt: new Date(),
    };

    // 初回アクティベーションの場合
    if (licenseData.status === "UNCLAIMED") {
      updateData.status = "ACTIVE";
      updateData.claimedAt = new Date();
    }

    await licenseDoc.ref.update(updateData);

    // JWTトークン生成
    const token = await signJWT({
      licenseId,
      email,
      plan: licenseData.plan,
      activationCount: updateData.activationCount,
    });

    // レスポンス設定
    const response = NextResponse.json({
      success: true,
      message: "ライセンスが正常にアクティベートされました",
      license: {
        plan: licenseData.plan,
        activationCount: updateData.activationCount,
        activationLimit: licenseData.activationLimit,
        expiresAt: licenseData.expiresAt,
      },
    });

    // HttpOnly CookieにJWTを設定
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30日
    });

    return response;

  } catch (error) {
    console.error("ライセンスアクティベーションエラー:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "入力データが無効です", 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: "ライセンスアクティベーションに失敗しました" 
    }, { status: 500 });
  }
}

// IPアドレスのハッシュ化
async function hashIP(ip: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(ip).digest('hex');
}