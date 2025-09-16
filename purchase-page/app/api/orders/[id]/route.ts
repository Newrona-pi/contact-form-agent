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
    const [paymentIntentsSnapshot, invoicesSnapshot, accountsSnapshot] = await Promise.all([
      db.collection("paymentIntents").where("orderId", "==", orderId).get(),
      db.collection("invoices").where("orderId", "==", orderId).get(),
      db.collection("accounts").where("orderId", "==", orderId).get(),
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

    const accounts = accountsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return NextResponse.json({
      order: {
        ...order,
        paymentIntents,
        invoices,
        accounts,
      },
    });

  } catch (error) {
    console.error("注文詳細取得エラー:", error);
    return NextResponse.json({ 
      error: "注文詳細の取得に失敗しました" 
    }, { status: 500 });
  }
}
