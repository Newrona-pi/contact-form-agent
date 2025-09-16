import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const { email, password } = Body.parse(await req.json());
    const accountSystemUrl = process.env.ACCOUNT_SYSTEM_URL || process.env.LICENSE_SYSTEM_URL;

    if (accountSystemUrl) {
      const response = await fetch(`${accountSystemUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        return NextResponse.json({
          success: false,
          error: errorBody.error || '認証に失敗しました',
        }, { status: response.status });
      }

      const data = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: true,
        data,
      });
    }

    console.warn('ACCOUNT_SYSTEM_URL is not configured. Allowing login for development.');
    return NextResponse.json({
      success: true,
      message: 'ログインに成功しました (開発モード)',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof z.ZodError ? '入力内容が正しくありません。' : 'ログイン処理に失敗しました',
    }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
