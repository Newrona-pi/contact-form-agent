import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

// 注文詳細取得API
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        company: true,
        contact: true,
        invoices: true,
        paymentIntents: true,
        licenses: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ order });

  } catch (error) {
    logError(error as Error, { action: "get_order", orderId: params.id });
    return NextResponse.json({ 
      error: "注文詳細の取得に失敗しました" 
    }, { status: 500 });
  }
}
