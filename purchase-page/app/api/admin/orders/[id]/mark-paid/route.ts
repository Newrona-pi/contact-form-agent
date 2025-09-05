import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateLicenseKey } from "@/lib/license";
import { sendLicenseIssued, sendInvoiceNotice } from "@/lib/mailer";
import { logLicenseIssued, logError } from "@/lib/logger";

// 管理用：入金反映→ライセンス発行API
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 管理者認証
    const adminToken = request.headers.get("x-admin-token");
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const orderId = params.id;

    // 注文情報取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        company: true,
        contact: true,
        invoices: true,
        licenses: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }

    if (order.paymentMethod !== "INVOICE") {
      return NextResponse.json({ error: "請求書払いではない注文です" }, { status: 400 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ error: "既に支払い済みです" }, { status: 400 });
    }

    // トランザクションで処理
    const result = await prisma.$transaction(async (tx) => {
      // 注文ステータス更新
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      // 請求書ステータス更新
      if (order.invoices.length > 0) {
        await tx.invoice.updateMany({
          where: { orderId },
          data: { status: "PAID" },
        });
      }

      // ライセンス生成（既に存在しない場合）
      let license = order.licenses[0];
      if (!license) {
        const licenseKey = generateLicenseKey();
        license = await tx.license.create({
          data: {
            orderId,
            key: licenseKey,
            status: "ACTIVE",
            seats: order.seats,
          },
        });
      }

      return { updatedOrder, license };
    });

    // ライセンス発行メール送信
    await sendLicenseIssued({
      to: order.contact.email,
      licenseKey: result.license.key,
      seats: order.seats,
      orderId,
    });

    // ログ記録
    logLicenseIssued(orderId, result.license.key, order.seats);

    return NextResponse.json({
      success: true,
      message: "入金反映とライセンス発行が完了しました",
      licenseKey: result.license.key,
    });

  } catch (error) {
    logError(error as Error, { action: "mark_paid", orderId: params.id });
    return NextResponse.json({ 
      error: "入金反映処理に失敗しました" 
    }, { status: 500 });
  }
}
