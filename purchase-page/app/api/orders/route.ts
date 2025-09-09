import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebase";
import { purchaseFormSchema, isFreeEmailDomain } from "@/lib/zodSchemas";
import { calculateTotalAmountFromForm, convertFormPlanToDbPlan } from "@/lib/price";
import { sendApplicationReceipt } from "@/lib/mailer";
import { logOrderCreation, logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rateLimit";

// 注文作成API
async function createOrder(request: NextRequest) {
  try {
    const body = await request.json();

    // ハニーポットチェック
    if (body.honeypot) {
      return NextResponse.json({ error: "不正な送信です" }, { status: 400 });
    }

    // 送信時間チェック（最低3秒）
    const submitTime = body.submitTime;
    if (!submitTime || Date.now() - submitTime < 3000) {
      return NextResponse.json({ error: "送信が早すぎます" }, { status: 400 });
    }

    // バリデーション
    const validatedData = purchaseFormSchema.parse(body);

    // フリーメールドメイン警告（ログに記録）
    if (isFreeEmailDomain(validatedData.email)) {
      console.warn(`フリーメールドメイン検出: ${validatedData.email}`);
    }

    const ordersRef = firestore.collection("orders");
    // 重複チェック（同一メールアドレスで最近の注文）
    const recentSnapshot = await ordersRef
      .where("contact.email", "==", validatedData.email)
      .where("createdAt", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000))
      .limit(1)
      .get();

    if (!recentSnapshot.empty) {
      return NextResponse.json(
        { error: "24時間以内に同じメールアドレスでの注文があります" },
        { status: 400 }
      );
    }

    // 料金計算
    const totalAmount = calculateTotalAmountFromForm(
      validatedData.plan,
      validatedData.seats
    );

    const orderData = {
      company: {
        name: validatedData.company_name,
        kana: validatedData.company_kana,
        department: validatedData.department,
        role: validatedData.role,
        addressZip: validatedData.address_zip,
        addressPref: validatedData.address_pref,
        addressCity: validatedData.address_city,
        addressLine1: validatedData.address_line1,
        addressLine2: validatedData.address_line2,
      },
      contact: {
        name: validatedData.contact_name,
        kana: validatedData.contact_kana,
        email: validatedData.email,
        phone: validatedData.phone,
      },
      plan: convertFormPlanToDbPlan(validatedData.plan),
      seats: validatedData.seats,
      startDate: validatedData.start_date ? new Date(validatedData.start_date) : null,
      useCase: validatedData.use_case,
      referralCode: validatedData.referral_code,
      notes: validatedData.notes,
      paymentMethod: validatedData.payment_method.toUpperCase(),
      status:
        validatedData.payment_method === "credit" ? "PENDING_PAYMENT" : "DRAFT",
      totalAmount,
      createdAt: new Date(),
    };

    // 注文作成
    const docRef = await ordersRef.add(orderData);

    // 申込控えメール送信
    await sendApplicationReceipt({
      to: validatedData.email,
      orderData: validatedData,
      orderId: docRef.id,
    });

    // ログ記録
    logOrderCreation(docRef.id, validatedData.email, totalAmount);

    return NextResponse.json({
      success: true,
      orderId: docRef.id,
      paymentMethod: validatedData.payment_method,
    });
  } catch (error) {
    logError(error as Error, { action: "create_order" });

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "入力内容に誤りがあります",
          details: JSON.parse(error.message),
        },
        { status: 400 }
      );
    }

    const err = error as Error;
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        {
          error: "注文の作成に失敗しました",
          message: err.message,
          stack: err.stack,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "注文の作成に失敗しました" },
      { status: 500 }
    );
  }
}

// 注文一覧取得API（開発用）
async function getOrders(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const ordersRef = firestore.collection("orders");
    const snapshot = await ordersRef
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const totalSnapshot = await ordersRef.count().get();
    const total = totalSnapshot.data().count;

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError(error as Error, { action: "get_orders" });
    return NextResponse.json(
      { error: "注文一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(createOrder);
export const GET = withRateLimit(getOrders);
