import React from "react";

interface AccountReadyProps {
  email: string;
  orderId: string;
  loginUrl: string;
}

export function AccountReady({ email, orderId, loginUrl }: AccountReadyProps) {
  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ color: "#059669", borderBottom: "2px solid #059669", paddingBottom: "10px" }}>
        ログイン情報のご案内
      </h1>

      <p>決済が完了し、ログインアカウントの準備が整いました。</p>

      <div style={{ backgroundColor: "#f0fdf4", padding: "20px", borderRadius: "8px", margin: "20px 0", borderLeft: "4px solid #059669" }}>
        <p><strong>ログインメールアドレス:</strong> {email}</p>
        <p><strong>ログインURL:</strong> <a href={loginUrl} style={{ color: "#059669" }}>{loginUrl}</a></p>
        <p><strong>注文番号:</strong> {orderId}</p>
      </div>

      <h2 style={{ color: "#374151", marginTop: "30px" }}>利用開始方法</h2>
      <ol style={{ lineHeight: 1.6 }}>
        <li>上記のログインURLにアクセス</li>
        <li>メールアドレスと、申込フォームで設定したパスワードを入力</li>
        <li>テンプレートやデータセットを設定して利用開始</li>
      </ol>

      <p style={{ marginTop: "30px" }}>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr style={{ margin: "30px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
      <p style={{ fontSize: "12px", color: "#6b7280" }}>
        FormAutoFiller Pro<br />
        このメールは自動送信されています。
      </p>
    </div>
  );
}
