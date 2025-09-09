import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";

// 注文詳細取得API
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
    }

    // 注文取得
    const orderDoc = await db.collection("orders").doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }

    const orderData = orderDoc.data();
    const order = {
      id: orderDoc.id,
      ...orderData,
    };

    // 関連データの取得
    const [paymentIntentsSnapshot, invoicesSnapshot, licensesSnapshot] = await Promise.all([
      db.collection("paymentIntents").where("orderId", "==", orderId).get(),
      db.collection("invoices").where("orderId", "==", orderId).get(),
      db.collection("licenses").where("orderId", "==", orderId).get(),
    ]);

    // 関連データを追加
    const paymentIntents = paymentIntentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const invoices = invoicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const licenses = licensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      order: {
        ...order,
        paymentIntents,
        invoices,
        licenses,
      },
    });

  } catch (error) {
    console.error("注文詳細取得エラー:", error);
    return NextResponse.json({ 
      error: "注文詳細の取得に失敗しました" 
    }, { status: 500 });
  }
}
