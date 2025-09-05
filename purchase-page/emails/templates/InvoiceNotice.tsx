import React from "react";

interface InvoiceNoticeProps {
  invoiceNumber: string;
  pdfUrl: string;
  dueDate: Date;
  orderId: string;
}

export function InvoiceNotice({ invoiceNumber, pdfUrl, dueDate, orderId }: InvoiceNoticeProps) {
  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;" }}>
      <h1 style={{ color: "#dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;" }}>
        見積書・請求書送付
      </h1>
      
      <p>お申し込みいただいたFormAutoFiller Proの見積書・請求書をお送りいたします。</p>
      
      <h2 style={{ color: "#374151; margin-top: 30px;">請求書情報</h2>
      <div style={{ backgroundColor: "#fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p><strong>請求書番号:</strong> {invoiceNumber}</p>
        <p><strong>支払期限:</strong> {dueDate.toLocaleDateString("ja-JP")}</p>
        <p><strong>注文番号:</strong> {orderId}</p>
      </div>
      
      <div style={{ textAlign: "center; margin: 30px 0;" }}>
        <a 
          href={pdfUrl} 
          style={{ backgroundColor: "#dc2626; color: white; padding: "12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;" }}
        >
          請求書をダウンロード
        </a>
      </div>
      
      <h2 style={{ color: "#374151; margin-top: 30px;">支払い方法</h2>
      <p>銀行振込にてお支払いください。振込手数料はお客様にてご負担ください。</p>
      
      <h2 style={{ color: "#374151; margin-top: 30px;">入金確認後の処理</h2>
      <p>入金確認後、ライセンスキーをメールでお送りいたします。</p>
      
      <p style={{ margin-top: 30px; }}>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr style={{ margin: "30px 0; border: none; border-top: 1px solid #e5e7eb;" }} />
      <p style={{ fontSize: "12px; color: #6b7280;" }}>
        FormAutoFiller Pro<br />
        このメールは自動送信されています。
      </p>
    </div>
  );
}
