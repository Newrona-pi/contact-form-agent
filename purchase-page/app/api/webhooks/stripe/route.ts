import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { generateLicenseKey } from "@/lib/license";
import { sendLicenseIssued } from "@/lib/mailer";
import { logPaymentSuccess, logLicenseIssued, logError } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Stripe Webhook処理
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // WebhookイベントをDBに記録
    await prisma.webhookEvent.create({
      data: {
        provider: "stripe",
        rawJson: JSON.stringify(event),
      },
    });

    // イベントタイプ別処理
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    logError(error as Error, { action: "stripe_webhook" });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// 決済成功処理
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (!orderId) {
      console.error("Order ID not found in payment intent metadata");
      return;
    }

    // 注文情報取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        company: true,
        contact: true,
        paymentIntents: true,
      },
    });

    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }

    // トランザクションで処理
    await prisma.$transaction(async (tx) => {
      // 注文ステータス更新
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      // PaymentIntentステータス更新
      await tx.paymentIntent.updateMany({
        where: { orderId },
        data: { status: "SUCCEEDED" },
      });

      // ライセンス生成
      const licenseKey = generateLicenseKey();
      await tx.license.create({
        data: {
          orderId,
          key: licenseKey,
          status: "ACTIVE",
          seats: order.seats,
        },
      });

      // 請求書作成（請求書払いの場合）
      if (order.paymentMethod === "INVOICE") {
        const invoiceNumber = `INV-${Date.now()}`;
        await tx.invoice.create({
          data: {
            orderId,
            number: invoiceNumber,
            status: "PAID",
          },
        });
      }
    });

    // ログ記録
    logPaymentSuccess(orderId, order.contact.email, order.totalAmount);

    // ライセンス発行メール送信
    const license = await prisma.license.findFirst({
      where: { orderId },
    });

    if (license) {
      await sendLicenseIssued({
        to: order.contact.email,
        licenseKey: license.key,
        seats: order.seats,
        orderId,
      });

      logLicenseIssued(orderId, license.key, order.seats);
    }

  } catch (error) {
    logError(error as Error, { action: "handle_payment_success", orderId: paymentIntent.metadata.orderId });
  }
}

// 決済失敗処理
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (!orderId) {
      console.error("Order ID not found in payment intent metadata");
      return;
    }

    // PaymentIntentステータス更新
    await prisma.paymentIntent.updateMany({
      where: { orderId },
      data: { status: "FAILED" },
    });

    // 注文ステータス更新（必要に応じて）
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PENDING_PAYMENT" },
    });

  } catch (error) {
    logError(error as Error, { action: "handle_payment_failed", orderId: paymentIntent.metadata.orderId });
  }
}
