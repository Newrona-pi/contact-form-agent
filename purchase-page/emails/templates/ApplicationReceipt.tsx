import React from "react";

interface ApplicationReceiptProps {
  orderData: {
    contact_name: string;
    company_name: string;
    plan: string;
    seats: number;
    payment_method: string;
  };
  orderId: string;
}

export function ApplicationReceipt({ orderData, orderId }: ApplicationReceiptProps) {
  const planNames = {
    one_time: "買い切り",
    monthly: "月額",
    annual: "年額",
  };

  const paymentMethodNames = {
    credit: "クレジットカード",
    invoice: "請求書払い",
  };

  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;" }}>
      <h1 style={{ color: "#2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;" }}>
        FormAutoFiller Pro お申し込み完了
      </h1>
      
      <p>{orderData.contact_name} 様</p>
      
      <p>この度は、FormAutoFiller Proにお申し込みいただき、誠にありがとうございます。</p>
      
      <h2 style={{ color: "#374151; margin-top: 30px;">申し込み内容</h2>
      <div style={{ backgroundColor: "#f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>会社名:</strong> {orderData.company_name}</p>
        <p><strong>プラン:</strong> {planNames[orderData.plan as keyof typeof planNames]}</p>
        <p><strong>席数:</strong> {orderData.seats}席</p>
        <p><strong>支払い方法:</strong> {paymentMethodNames[orderData.payment_method as keyof typeof paymentMethodNames]}</p>
        <p><strong>注文番号:</strong> {orderId}</p>
      </div>
      
      {orderData.payment_method === "credit" ? (
        <>
          <h2 style={{ color: "#374151; margin-top: 30px;">次のステップ</h2>
          <p>クレジットカード決済が完了次第、ライセンスキーをメールでお送りいたします。</p>
        </>
      ) : (
        <>
          <h2 style={{ color: "#374151; margin-top: 30px;">次のステップ</h2>
          <p>請求書払いをご選択いただきました。見積書・請求書を別途メールでお送りいたします。</p>
          <p>入金確認後、ライセンスキーを発行いたします。</p>
        </>
      )}
      
      <p style={{ margin-top: 30px; }}>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr style={{ margin: "30px 0; border: none; border-top: 1px solid #e5e7eb;" }} />
      <p style={{ fontSize: "12px; color: #6b7280;" }}>
        FormAutoFiller Pro<br />
        このメールは自動送信されています。
      </p>
    </div>
  );
}
