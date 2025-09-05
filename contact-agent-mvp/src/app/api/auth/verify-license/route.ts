import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({
  licenseKey: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const { licenseKey } = Body.parse(await req.json());

    // 環境変数の取得状況をログ出力
    const licenseSystemUrl = process.env.LICENSE_SYSTEM_URL || 'http://localhost:3001';
    console.log('Environment variables:', {
      LICENSE_SYSTEM_URL: process.env.LICENSE_SYSTEM_URL,
      NODE_ENV: process.env.NODE_ENV,
      resolvedUrl: licenseSystemUrl
    });

    // license-keyシステムの認証APIを呼び出し
    const response = await fetch(`${licenseSystemUrl}/api/auth/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@contact-agent.com', // 管理者用の固定メールアドレス
        licenseKey: licenseKey,
        device: 'contact-agent-mvp'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ 
        valid: true, 
        message: 'ライセンスが有効です',
        data: data
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        valid: false, 
        message: 'ライセンスが無効です',
        error: errorData.error || 'UNKNOWN_ERROR'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('License verification error:', error);
    return NextResponse.json({ 
      valid: false, 
      message: 'ライセンスの検証中にエラーが発生しました',
      error: 'VERIFICATION_ERROR'
    }, { status: 500 });
  }
}
