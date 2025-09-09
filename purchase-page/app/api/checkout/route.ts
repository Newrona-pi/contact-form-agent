import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/lib/firebase";
import { withRateLimit } from "@/lib/rateLimit";
import { FieldValue } from "firebase-admin/firestore";

interface Order {
  id: string;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  company: {
    name: string;
  };
  contact: {
    email: string;
  };
}

type OrderData = Omit<Order, "id">;

interface Order {
  id: string;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  company: {
    name: string;
  };
  contact: {
    email: string;
  };
}

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

    const db = getDb();

    // 注文情報取得
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }

const orderData = orderDoc.data() as OrderData | undefined;
if (
  !orderData ||
  !orderData.paymentMethod ||
  !orderData.status ||
  !orderData.company?.name ||
  !orderData.contact?.email
) {
  return NextResponse.json({ error: "注文データが不正です" }, { status: 500 });
}
    const order: Order = {
      id: orderDoc.id,
      ...orderData,
    };

    if (order.paymentMethod !== "CREDIT") {
      return NextResponse.json({ error: "クレジットカード決済ではない注文です" }, { status: 400 });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "決済待ちの注文ではありません" }, { status: 400 });
    }

    // 既存のPaymentIntentをチェック
    const existingPaymentIntentsSnapshot = await db
      .collection("paymentIntents")
      .where("orderId", "==", orderId)
      .where("status", "==", "PENDING")
      .limit(1)
      .get();

    if (!existingPaymentIntentsSnapshot.empty) {
      const existingPaymentIntent = existingPaymentIntentsSnapshot.docs[0].data();
      return NextResponse.json({
        clientSecret: existingPaymentIntent.clientSecret,
      });
    }

    // Stripe PaymentIntent作成
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: order.totalAmount,
        currency: "jpy",
        metadata: {
          orderId: order.id,
          companyName: order.company.name,
          contactEmail: order.contact.email,
        },
        description: `FormAutoFiller Pro - ${order.company.name}`,
      },
      { idempotencyKey: `order-${order.id}` }
    );

    // PaymentIntentをFirestoreに保存
    await db.collection("paymentIntents").add({
      orderId: order.id,
      provider: "STRIPE",
      clientSecret: paymentIntent.client_secret!,
      status: "PENDING",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("決済処理エラー:", error);
    return NextResponse.json({ 
      error: "決済処理の開始に失敗しました" 
    }, { status: 500 });
  }
}

export const POST = withRateLimit(createPaymentIntent);
