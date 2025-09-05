import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLicenseKey } from "@/lib/license";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rateLimit";

// ライセンスキー検証API
async function verifyLicense(request: NextRequest) {
  try {
    const { licenseKey } = await request.json();

    if (!licenseKey) {
      return NextResponse.json({ error: "ライセンスキーが必要です" }, { status: 400 });
    }

    // ライセンス情報取得
    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
      include: {
        order: {
          include: {
            company: true,
            contact: true,
          },
        },
      },
    });

    if (!license) {
      return NextResponse.json({ 
        valid: false, 
        error: "ライセンスキーが見つかりません" 
      }, { status: 404 });
    }

    // ライセンスステータスチェック
    if (license.status !== "ACTIVE") {
      return NextResponse.json({ 
        valid: false, 
        error: "ライセンスが無効です" 
      }, { status: 400 });
    }

    // 注文ステータスチェック
    if (license.order.status !== "PAID") {
      return NextResponse.json({ 
        valid: false, 
        error: "支払いが完了していません" 
      }, { status: 400 });
    }

    // HMAC検証（オプション）
    const licenseSecret = process.env.LICENSE_SECRET;
    if (licenseSecret) {
      // 実際の実装では、ライセンスキーと一緒にHMACも保存・検証する
      // ここでは簡易実装として、ライセンスキーの存在確認のみ
    }

    return NextResponse.json({
      valid: true,
      license: {
        key: license.key,
        seats: license.seats,
        status: license.status,
        issuedAt: license.issuedAt,
        companyName: license.order.company.name,
        plan: license.order.plan,
      },
    });

  } catch (error) {
    logError(error as Error, { action: "verify_license" });
    return NextResponse.json({ 
      error: "ライセンス検証に失敗しました" 
    }, { status: 500 });
  }
}

export const POST = withRateLimit(verifyLicense);
