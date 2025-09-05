import React from "react";

interface LicenseIssuedProps {
  licenseKey: string;
  seats: number;
  orderId: string;
}

export function LicenseIssued({ licenseKey, seats, orderId }: LicenseIssuedProps) {
  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ color: "#059669", borderBottom: "2px solid #059669", paddingBottom: "10px" }}>
        ライセンスキー発行完了
      </h1>
      
      <p>決済が完了し、ライセンスキーが発行されました。</p>
      
      <h2 style={{ color: "#374151", marginTop: "30px" }}>ライセンス情報</h2>
      <div style={{ backgroundColor: "#f0fdf4", padding: "20px", borderRadius: "8px", margin: "20px 0", borderLeft: "4px solid #059669" }}>
        <p><strong>ライセンスキー:</strong></p>
        <p style={{ fontFamily: "monospace", fontSize: "18px", fontWeight: "bold", color: "#059669", backgroundColor: "#f9fafb", padding: "10px", borderRadius: "4px", wordBreak: "break-all" }}>
          {licenseKey}
        </p>
        <p><strong>利用可能席数:</strong> {seats}席</p>
        <p><strong>注文番号:</strong> {orderId}</p>
      </div>
      
      <h2 style={{ color: "#374151", marginTop: "30px" }}>利用開始方法</h2>
      <ol style={{ lineHeight: 1.6 }}>
        <li>FormAutoFiller Proアプリケーションをダウンロード</li>
        <li>上記のライセンスキーを入力</li>
        <li>利用開始</li>
      </ol>
      
      <p style={{ margin-top: 30px; }}>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr style={{ margin: "30px 0; border: none; border-top: 1px solid #e5e7eb;" }} />
      <p style={{ fontSize: "12px; color: #6b7280;" }}>
        FormAutoFiller Pro<br />
        このメールは自動送信されています。
      </p>
    </div>
  );
}
