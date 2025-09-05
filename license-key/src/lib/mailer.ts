import nodemailer from "nodemailer";

const port = Number(process.env.SMTP_PORT || 587);
const secure = port === 465; // 465ならtrue

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendLicenseEmail(to: string, fullKey: string) {
  const app = process.env.APP_NAME || "Your App";
  const base = process.env.APP_BASE_URL;
  
  // 開発環境ではメール送信の代わりにコンソールに出力
  console.log('=== ライセンスキー発行 ===');
  console.log('Email:', to);
  console.log('License Key:', fullKey);
  console.log('Login URL:', `${base}/login`);
  console.log('========================');
  
  // メール送信は無効化（本番環境では有効化）
  // const html = `
  //   <p>${app} をご購入いただきありがとうございます。</p>
  //   <p>以下があなたのライセンスキーです：</p>
  //   <pre style="padding:12px;background:#f6f6f6;border-radius:8px;font-size:16px">${fullKey}</pre>
  //   <p>ログインページ： <a href="${base}/login">${base}/login</a></p>
  //   <p>※ このキーは第三者と共有しないでください。</p>
  // `;

  // await transporter.sendMail({
  //   from: process.env.SMTP_FROM,
  //   to,
  //   subject: `${app} ライセンスキーのご案内`,
  //   text: `ライセンスキー: ${fullKey}\nログイン: ${base}/login`,
  //   html,
  // });
}
