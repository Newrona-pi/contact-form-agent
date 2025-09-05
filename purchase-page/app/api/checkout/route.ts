import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rateLimit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Stripe PaymentIntent作成API
async function createPaymentIntent(request: NextRequest) {
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

    if (order.paymentMethod !== "CREDIT") {
      return NextResponse.json({ error: "クレジットカード決済ではない注文です" }, { status: 400 });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "決済待ちの注文ではありません" }, { status: 400 });
    }

    // 既存のPaymentIntentをチェック
    const existingPaymentIntent = await prisma.paymentIntent.findFirst({
      where: {
        orderId: order.id,
        status: "PENDING",
      },
    });

    if (existingPaymentIntent) {
      return NextResponse.json({
        clientSecret: existingPaymentIntent.clientSecret,
      });
    }

    // Stripe PaymentIntent作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.totalAmount,
      currency: "jpy",
      metadata: {
        orderId: order.id,
        companyName: order.company.name,
        contactEmail: order.contact.email,
      },
      description: `FormAutoFiller Pro - ${order.company.name}`,
    });

    // PaymentIntentをDBに保存
    await prisma.paymentIntent.create({
      data: {
        orderId: order.id,
        provider: "STRIPE",
        clientSecret: paymentIntent.client_secret!,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    logError(error as Error, { action: "create_payment_intent" });
    return NextResponse.json({ 
      error: "決済処理の開始に失敗しました" 
    }, { status: 500 });
  }
}

export const POST = withRateLimit(createPaymentIntent);
