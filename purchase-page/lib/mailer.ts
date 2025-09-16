import { Resend } from "resend";

// APIキーが設定されていない環境ではメール送信をスキップする
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("RESEND_API_KEY is not set. Email functionality is disabled.");
}

// メール送信関数
export async function sendEmail({
  to,
  cc,
  subject,
  html,
  text,
}: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) {
    console.warn("Skipping email send because RESEND_API_KEY is not configured.");
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: "FormAutoFiller Pro <noreply@formautofiller-pro.com>",
      to,
      cc,
      subject,
      html,
      text,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("メール送信エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// 申込控えメール送信
export async function sendApplicationReceipt({
  to,
  orderData,
  orderId,
}: {
  to: string;
  orderData: any;
  orderId: string;
}) {
  const subject = "【FormAutoFiller Pro】お申し込みありがとうございます";
  
  const html = `
    <div style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        FormAutoFiller Pro お申し込み完了
      </h1>

      <p>${orderData.contact_name} 様</p>

      <p>この度は、FormAutoFiller Proにお申し込みいただき、誠にありがとうございます。</p>

      <h2 style="color: #374151; margin-top: 30px;">申し込み内容</h2>
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>会社名:</strong> ${orderData.company_name}</p>
        <p><strong>プラン:</strong> ${orderData.plan === "one_time" ? "買い切り" : orderData.plan === "monthly" ? "月額" : "年額"}</p>
        <p><strong>席数:</strong> ${orderData.seats}席</p>
        <p><strong>支払い方法:</strong> ${orderData.payment_method === "credit" ? "クレジットカード" : "請求書払い"}</p>
        <p><strong>注文番号:</strong> ${orderId}</p>
      </div>

      <h2 style="color: #374151; margin-top: 30px;">ログイン情報</h2>
      <div style="background-color: #eef2ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
        <p><strong>ログインメールアドレス:</strong> ${orderData.email}</p>
        <p><strong>パスワード:</strong> 申込フォームで設定いただいた内容をご利用ください。</p>
      </div>

      ${orderData.payment_method === "credit" ? `
        <h2 style="color: #374151; margin-top: 30px;">次のステップ</h2>
        <p>クレジットカード決済が完了次第、ログインURLとご利用開始ガイドをメールでお送りします。</p>
      ` : `
        <h2 style="color: #374151; margin-top: 30px;">次のステップ</h2>
        <p>請求書払いをご選択いただきました。見積書・請求書を別途メールでお送りいたします。</p>
        <p>入金確認後、アカウントを有効化しログイン方法をご案内いたします。</p>
      `}

      <p style="margin-top: 30px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280;">
        FormAutoFiller Pro<br>
        このメールは自動送信されています。
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// アカウント利用開始メール送信
export async function sendAccountReady({
  to,
  email,
  orderId,
  loginUrl = process.env.TOOL_APP_URL ?? "https://app.formautofiller-pro.com",
}: {
  to: string;
  email: string;
  orderId: string;
  loginUrl?: string;
}) {
  const subject = "【FormAutoFiller Pro】ログインのご案内";

  const html = `
    <div style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
        ログイン情報のご案内
      </h1>

      <p>決済が完了し、ログインアカウントの準備が整いました。</p>

      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
        <p><strong>ログインメールアドレス:</strong> ${email}</p>
        <p><strong>ログインURL:</strong> <a href="${loginUrl}" style="color: #059669;">${loginUrl}</a></p>
        <p><strong>注文番号:</strong> ${orderId}</p>
      </div>

      <h2 style="color: #374151; margin-top: 30px;">ご利用開始手順</h2>
      <ol style="line-height: 1.6;">
        <li>上記のログインURLにアクセス</li>
        <li>メールアドレスと、申込フォームで設定したパスワードを入力</li>
        <li>テンプレートやデータセットを設定して利用開始</li>
      </ol>

      <p style="margin-top: 30px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280;">
        FormAutoFiller Pro<br>
        このメールは自動送信されています。
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

// 請求書送付メール送信
export async function sendInvoiceNotice({
  to,
  cc,
  invoiceNumber,
  pdfUrl,
  dueDate,
  orderId,
}: {
  to: string;
  cc?: string;
  invoiceNumber: string;
  pdfUrl: string;
  dueDate: Date;
  orderId: string;
}) {
  const subject = "【FormAutoFiller Pro】見積書・請求書をお送りいたします";
  
  const html = `
    <div style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
        見積書・請求書送付
      </h1>
      
      <p>お申し込みいただいたFormAutoFiller Proの見積書・請求書をお送りいたします。</p>
      
      <h2 style="color: #374151; margin-top: 30px;">請求書情報</h2>
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p><strong>請求書番号:</strong> ${invoiceNumber}</p>
        <p><strong>支払期限:</strong> ${dueDate.toLocaleDateString("ja-JP")}</p>
        <p><strong>注文番号:</strong> ${orderId}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${pdfUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          請求書をダウンロード
        </a>
      </div>
      
      <h2 style="color: #374151; margin-top: 30px;">支払い方法</h2>
      <p>銀行振込にてお支払いください。振込手数料はお客様にてご負担ください。</p>
      
      <h2 style="color: #374151; margin-top: 30px;">入金確認後の処理</h2>
      <p>入金確認後、ログインアカウントを有効化しご案内いたします。</p>
      
      <p style="margin-top: 30px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280;">
        FormAutoFiller Pro<br>
        このメールは自動送信されています。
      </p>
    </div>
  `;

  return sendEmail({ to, cc, subject, html });
}
