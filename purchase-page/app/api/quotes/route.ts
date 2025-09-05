import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rateLimit";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// 見積PDF生成API
async function generateQuote(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "注文IDが必要です" }, { status: 400 });
    }

    // 注文情報取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        company: true,
        contact: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }

    if (order.paymentMethod !== "INVOICE") {
      return NextResponse.json({ error: "請求書払いではない注文です" }, { status: 400 });
    }

    // 請求書番号生成
    const invoiceNumber = `QUO-${Date.now()}`;

    // PDF生成
    const doc = new PDFDocument({ margin: 50 });
    const pdfPath = path.join(process.cwd(), "public", "tmp", `${invoiceNumber}.pdf`);
    
    // ディレクトリが存在しない場合は作成
    const tmpDir = path.dirname(pdfPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(pdfPath));

    // ヘッダー
    doc.fontSize(20).text("FormAutoFiller Pro", 50, 50);
    doc.fontSize(16).text("見積書", 50, 80);
    doc.fontSize(12).text(`請求書番号: ${invoiceNumber}`, 50, 110);
    doc.text(`発行日: ${new Date().toLocaleDateString("ja-JP")}`, 50, 130);

    // 会社情報
    doc.fontSize(14).text("請求先", 50, 170);
    doc.fontSize(12).text(order.company.name, 50, 200);
    if (order.company.department) {
      doc.text(order.company.department, 50, 220);
    }
    if (order.company.addressLine1) {
      doc.text(order.company.addressLine1, 50, 240);
    }
    if (order.company.addressLine2) {
      doc.text(order.company.addressLine2, 50, 260);
    }

    // 担当者情報
    doc.fontSize(14).text("担当者", 300, 170);
    doc.fontSize(12).text(order.contact.name, 300, 200);
    doc.text(order.contact.email, 300, 220);

    // 商品詳細
    doc.fontSize(14).text("商品詳細", 50, 320);
    
    const planNames = {
      ONE_TIME: "買い切り",
      MONTHLY: "月額",
      ANNUAL: "年額",
    };

    const planPrices = {
      ONE_TIME: 29800,
      MONTHLY: 1980,
      ANNUAL: 19800,
    };

    doc.fontSize(12);
    doc.text("FormAutoFiller Pro", 50, 350);
    doc.text(`${planNames[order.plan]}プラン`, 200, 350);
    doc.text(`${order.seats}席`, 350, 350);
    doc.text(`¥${planPrices[order.plan].toLocaleString()}`, 400, 350);
    doc.text(`¥${(planPrices[order.plan] * order.seats).toLocaleString()}`, 500, 350);

    // 合計
    doc.fontSize(14).text(`合計: ¥${order.totalAmount.toLocaleString()}`, 400, 400);

    // 支払い条件
    doc.fontSize(12).text("支払い条件", 50, 450);
    doc.text("銀行振込にてお支払いください。", 50, 470);
    doc.text("振込手数料はお客様にてご負担ください。", 50, 490);

    doc.end();

    // ファイル生成完了を待つ
    await new Promise((resolve) => {
      doc.on("end", resolve);
    });

    // 請求書レコード作成
    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        number: invoiceNumber,
        pdfUrl: `/tmp/${invoiceNumber}.pdf`,
        status: "DRAFT",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      },
    });

    return NextResponse.json({
      success: true,
      invoiceNumber: invoice.number,
      pdfUrl: invoice.pdfUrl,
      dueDate: invoice.dueDate,
    });

  } catch (error) {
    logError(error as Error, { action: "generate_quote" });
    return NextResponse.json({ 
      error: "見積書の生成に失敗しました" 
    }, { status: 500 });
  }
}

export const POST = withRateLimit(generateQuote);
