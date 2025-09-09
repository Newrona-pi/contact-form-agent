import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { z } from "zod";
import { withRateLimit } from "@/lib/rateLimit";

const orderSchema = z.object({
  company: z.object({
    name: z.string().min(1),
    department: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    prefecture: z.string().optional(),
  }),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    position: z.string().optional(),
  }),
  billing: z.object({
    name: z.string().optional(),
    department: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    prefecture: z.string().optional(),
  }).optional(),
  plan: z.enum(['ONE_TIME', 'MONTHLY', 'ANNUAL']),
  seats: z.number().min(1),
  paymentMethod: z.enum(['CREDIT', 'INVOICE']),
});

// 料金計算
function calculateTotalAmount(plan: string, seats: number): number {
  const planPrices: Record<string, number> = {
    ONE_TIME: 29800,
    MONTHLY: 1980,
    ANNUAL: 19800,
  };
  
  return planPrices[plan] * seats;
}

async function createOrder(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = orderSchema.parse(body);

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
    }

    // 合計金額計算
    const totalAmount = calculateTotalAmount(validatedData.plan, validatedData.seats);

    // 注文データ作成
    const orderData = {
      ...validatedData,
      totalAmount,
      status: "PENDING_PAYMENT",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Firestoreに注文を保存
    const orderRef = await db.collection("orders").add(orderData);
    const orderId = orderRef.id;

    // 注文データを取得（IDを含む）
    const createdOrder = {
      id: orderId,
      ...orderData,
    };

    return NextResponse.json({
      success: true,
      order: createdOrder,
      message: "注文が正常に作成されました",
    });

  } catch (error) {
    console.error("注文作成エラー:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "入力データが無効です", 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: "注文作成に失敗しました" 
    }, { status: 500 });
  }
}

export const POST = withRateLimit(createOrder);