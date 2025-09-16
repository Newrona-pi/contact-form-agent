import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/firebase";
import { verifyPassword } from "@/lib/password";
import { withRateLimit } from "@/lib/rateLimit";
import { logError, maskEmail } from "@/lib/logger";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function login(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const db = getDb();
    const accountSnapshot = await db
      .collection("accounts")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (accountSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: "メールアドレスまたはパスワードが正しくありません",
      }, { status: 401 });
    }

    const accountDoc = accountSnapshot.docs[0];
    const accountData = accountDoc.data() as Record<string, any>;

    const passwordHash = accountData.passwordHash as string | undefined;
    const passwordSalt = accountData.passwordSalt as string | undefined;
    const passwordIterations = accountData.passwordIterations as number | undefined;
    const passwordKeyLength = accountData.passwordKeyLength as number | undefined;
    const passwordDigest = accountData.passwordDigest as string | undefined;

    if (!passwordHash || !passwordSalt) {
      logError(new Error("account password data missing"), {
        accountId: accountDoc.id,
        email: maskEmail(email),
      });

      return NextResponse.json({
        success: false,
        error: "アカウント情報が不完全です。サポートにお問い合わせください。",
      }, { status: 500 });
    }

    const isValidPassword = verifyPassword(password, passwordHash, passwordSalt, {
      iterations: passwordIterations,
      keyLength: passwordKeyLength,
      digest: passwordDigest,
    });

    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: "メールアドレスまたはパスワードが正しくありません",
      }, { status: 401 });
    }

    if (accountData.status === "SUSPENDED") {
      return NextResponse.json({
        success: false,
        error: "アカウントが停止されています。サポートにお問い合わせください。",
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      account: {
        id: accountDoc.id,
        email: accountData.email,
        status: accountData.status ?? null,
        plan: accountData.plan ?? null,
        seats: accountData.seats ?? null,
        orderId: accountData.orderId ?? null,
        createdAt: accountData.createdAt ?? null,
        updatedAt: accountData.updatedAt ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "入力内容が正しくありません",
        details: error.flatten(),
      }, { status: 400 });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: "リクエストボディが不正です",
      }, { status: 400 });
    }

    logError(error as Error, { endpoint: "auth_login" });

    return NextResponse.json({
      success: false,
      error: "ログイン処理に失敗しました",
    }, { status: 500 });
  }
}

export const POST = withRateLimit(login);
