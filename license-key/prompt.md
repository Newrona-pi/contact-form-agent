# README

このキットは「指定したメールアドレスへライセンスキーを送付し、そのキーでログインしてツールにアクセスさせる」最小構成です。
- **スタック**: Next.js (App Router) + Firebase + Nodemailer(SMTP)
- **機能**:
  - 管理者APIでライセンス発行 → メール送付
  - ライセンスキー + メールで有効化 → JWTをHttpOnly Cookieにセット
  - `/tool` を認証必須ページとして保護

---

## 1) フォルダ構成
```
my-license-app/
  .env
  package.json
  prisma/
    schema.prisma
  src/
    lib/
      prisma.ts
      jwt.ts
      license.ts
      mailer.ts
  app/
    layout.tsx
    page.tsx
    middleware.ts (プロジェクト直下に置く)
    login/
      page.tsx
    tool/
      page.tsx
    api/
      admin/
        issue-license/route.ts
      auth/
        activate/route.ts
        logout/route.ts
```

---

## 2) 依存関係 & スクリプト（`package.json`）
```json
{
  "name": "my-license-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init"
  },
  "dependencies": {
    "argon2": "^0.41.1",
    "jose": "^5.9.6",
    "next": "^14.2.5",
    "nodemailer": "^6.9.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8",
    "@prisma/client": "^5.18.0"
  },
  "devDependencies": {
    "prisma": "^5.18.0",
    "typescript": "^5.5.4"
  }
}
```

---

## 3) 環境変数（`.env`）
> ローカル最小構成はSQLiteでOK。SMTPは任意のプロバイダ（SendGrid, AWS SES, さくら等）を利用。
```
# DB
DATABASE_URL="file:./dev.db"  # PostgreSQL例: postgresql://USER:PASSWORD@HOST:PORT/DB

# 認証
JWT_SECRET="change_me_long_random"  # HS256用の十分長いランダム文字列
ADMIN_TOKEN="change_admin_token"    # 管理者API保護用ヘッダトークン

# メール送信(SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"              # 465ならsecure=true推奨
SMTP_USER="mailer@example.com"
SMTP_PASS="smtp_password"
SMTP_FROM="Your App <no-reply@example.com>"

# アプリ表示
APP_NAME="My License App"
APP_BASE_URL="http://localhost:3000" # 本番はhttps://your-domain
```

---

## 4) Prisma スキーマ（`prisma/schema.prisma`）
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = env("DATABASE_PROVIDER") != "postgresql" ? "sqlite" : "postgresql"
  url      = env("DATABASE_URL")
}

model License {
  id              String   @id @default(cuid())
  email           String
  keyId           String   @unique
  secretHash      String
  plan            String   @default("basic")
  status          LicenseStatus @default(UNCLAIMED)
  activationLimit Int      @default(1)
  activationCount Int      @default(0)
  expiresAt       DateTime?
  claimedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  activations     Activation[]
}

enum LicenseStatus {
  UNCLAIMED
  ACTIVE
  REVOKED
  EXPIRED
}

model Activation {
  id          String   @id @default(cuid())
  licenseId   String
  license     License  @relation(fields: [licenseId], references: [id])
  device      String?
  ipHash      String?
  userAgent   String?
  createdAt   DateTime @default(now())
}
```

---

## 5) Prisma Client 初期化（`src/lib/prisma.ts`）
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 6) JWTユーティリティ（`src/lib/jwt.ts`）
```ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createAccessToken(payload: object, expiresIn = "15m") {
  return await new SignJWT({ ...payload, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
```

---

## 7) ライセンス生成ユーティリティ（`src/lib/license.ts`）
```ts
import crypto from "crypto";
import argon2 from "argon2";

function group4(s: string) {
  return s.match(/.{1,4}/g)?.join("-") ?? s;
}

export function generateKeyId() {
  // 12 hex (48bit) を大文字化
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

export function generateSecret() {
  // base64url 22~23桁程度
  const raw = crypto.randomBytes(16).toString("base64url");
  return raw.toUpperCase();
}

export function formatLicense(keyId: string, secret: string) {
  return `RP1-${group4(keyId)}.${group4(secret)}`;
}

export function parseLicense(full: string) {
  const [left, right] = full.split(".");
  if (!left || !right) throw new Error("INVALID_FORMAT");
  const keyId = left.replace(/^RP1-/, "").replace(/-/g, "");
  const secret = right.replace(/-/g, "");
  return { keyId, secret };
}

export async function hashSecret(secret: string) {
  return argon2.hash(secret);
}

export async function verifySecret(hash: string, secret: string) {
  return argon2.verify(hash, secret);
}
```

---

## 8) メール送信（`src/lib/mailer.ts`）
```ts
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
  const html = `
    <p>${app} をご購入いただきありがとうございます。</p>
    <p>以下があなたのライセンスキーです：</p>
    <pre style="padding:12px;background:#f6f6f6;border-radius:8px;font-size:16px">${fullKey}</pre>
    <p>ログインページ： <a href="${base}/login">${base}/login</a></p>
    <p>※ このキーは第三者と共有しないでください。</p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `${app} ライセンスキーのご案内`,
    text: `ライセンスキー: ${fullKey}\nログイン: ${base}/login`,
    html,
  });
}
```

---

## 9) 管理者: ライセンス発行API（`app/api/admin/issue-license/route.ts`）
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { generateKeyId, generateSecret, formatLicense, hashSecret } from "@/src/lib/license";
import { z } from "zod";
import { sendLicenseEmail } from "@/src/lib/mailer";

export const runtime = "nodejs"; // argon2使用のためNode実行

const Body = z.object({
  email: z.string().email(),
  plan: z.string().default("basic"),
  activationLimit: z.number().int().min(1).max(10).default(1),
});

export async function POST(req: NextRequest) {
  const admin = req.headers.get("x-admin-token");
  if (admin !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json();
  const { email, plan, activationLimit } = Body.parse(json);

  const keyId = generateKeyId();
  const secret = generateSecret();
  const fullKey = formatLicense(keyId, secret);
  const secretHash = await hashSecret(secret);

  const lic = await prisma.license.create({
    data: {
      email,
      keyId,
      secretHash,
      plan,
      activationLimit,
      status: "UNCLAIMED",
    },
  });

  await sendLicenseEmail(email, fullKey);

  return NextResponse.json({ ok: true, licenseId: lic.id });
}
```

---

## 10) 有効化API（`app/api/auth/activate/route.ts`）
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { parseLicense, verifySecret } from "@/src/lib/license";
import { createAccessToken } from "@/src/lib/jwt";
import { z } from "zod";
import crypto from "crypto";

export const runtime = "nodejs"; // argon2使用のためNode実行

const Body = z.object({
  email: z.string().email(),
  licenseKey: z.string().min(8),
  device: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { email, licenseKey, device } = Body.parse(await req.json());

  let keyId: string, secret: string;
  try { ({ keyId, secret } = parseLicense(licenseKey)); }
  catch { return NextResponse.json({ error: "INVALID_LICENSE" }, { status: 400 }); }

  const lic = await prisma.license.findUnique({ where: { keyId } });
  if (!lic || lic.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (lic.status === "REVOKED" || lic.status === "EXPIRED") {
    return NextResponse.json({ error: lic.status }, { status: 403 });
  }
  if (!(await verifySecret(lic.secretHash, secret))) {
    return NextResponse.json({ error: "INVALID_LICENSE" }, { status: 403 });
  }

  // アクティベーション制御（最小実装）
  if (lic.activationCount >= lic.activationLimit) {
    return NextResponse.json({ error: "ACTIVATION_LIMIT" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.license.update({
      where: { id: lic.id },
      data: {
        status: lic.status === "UNCLAIMED" ? "ACTIVE" : lic.status,
        activationCount: { increment: 1 },
        claimedAt: lic.claimedAt ?? new Date(),
      },
    }),
    prisma.activation.create({
      data: {
        licenseId: lic.id,
        device: device ?? null,
        ipHash: crypto.createHash("sha256").update(req.ip ?? "").digest("hex"),
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }),
  ]);

  const access = await createAccessToken({ sub: lic.id, email: lic.email, plan: lic.plan }, "30m");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}
```

---

## 11) ログアウトAPI（`app/api/auth/logout/route.ts`）
```ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", "", { path: "/", maxAge: 0 });
  return res;
}
```

---

## 12) 認証ミドルウェア（`app/middleware.ts` → ルート直下に `middleware.ts` として配置）
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/src/lib/jwt";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const url = req.nextUrl.clone();

  if (!token) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    await verifyAccessToken(token);
    return NextResponse.next();
  } catch {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/tool/:path*"], // /tool 配下を保護
};
```

> **注意**: middleware はEdgeで動きますが、HS256検証は問題なく動作します。`argon2` は使っていないためEdge可。

---

## 13) 画面: レイアウトとトップ（`app/layout.tsx`, `app/page.tsx`）
```tsx
// app/layout.tsx
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
```
```tsx
// app/page.tsx
export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-2">ようこそ</h1>
      <p>このアプリはライセンスキーでログインして /tool にアクセスできます。</p>
    </main>
  );
}
```

※ `globals.css` は任意（Tailwind等は好みで）。

---

## 14) 画面: ログイン（`app/login/page.tsx`）
```tsx
'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, licenseKey: key })
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = '/tool';
    } else {
      const j = await res.json().catch(()=>({}));
      setError(j.error || 'ログインに失敗しました');
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">ライセンスログイン</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">メールアドレス</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">ライセンスキー</label>
          <input className="w-full border rounded px-3 py-2 font-mono" value={key} onChange={e=>setKey(e.target.value)} required placeholder="RP1-XXXX-XXXX.XXXX-XXXX-..." />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">{loading ? '送信中...' : 'ログイン'}</button>
      </form>
    </main>
  );
}
```

---

## 15) 画面: 保護されたツール（`app/tool/page.tsx`）
```tsx
export default async function ToolPage() {
  // 必要であればサーバー側でCookie/JWTを読み出し、プロフィール取得などを実装
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-2">ツール本体</h1>
      <p>ここは認証済みユーザーのみがアクセスできます。</p>
      <form action="/api/auth/logout" method="post">
        <button className="mt-4 border rounded px-3 py-2">ログアウト</button>
      </form>
    </main>
  );
}
```

---

## 16) クイックスタート
```bash
# 1) 依存インストール
npm i

# 2) Prisma 初期化（DB生成）
npx prisma generate
npm run prisma:migrate

# 3) 開発起動
npm run dev
```

**ライセンス発行（メール送付）**
```bash
curl -X POST "http://localhost:3000/api/admin/issue-license" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "plan": "basic",
    "activationLimit": 1
  }'
```
受信したメールに記載されたキーで `/login` からログイン → `/tool` にアクセス可能。

---

## 17) 運用メモ（最小構成の延長）
- **失効/返金**: `status=REVOKED` に更新すれば即時ブロック可能（次回JWT発行は不可に）。
- **期限付き**: `expiresAt` を設定し、`activate` 時やミドルウェアで期限チェックを追加。
- **席数/同時実行**: `activationLimit` を超えたら拒否。解除用の管理APIを別途実装。
- **レート制限**: `/api/auth/activate` と `/api/admin/issue-license` にIP/Key単位のレート制限を推奨。
- **メールテンプレ**: HTMLをブランドに合わせて整える（ロゴ、サポート連絡先）。
- **DB切替**: 本番はPostgreSQL推奨。`.env` の `DATABASE_URL` を差し替え→ `prisma migrate deploy`。
- **セキュリティ**: `ADMIN_TOKEN` は長く複雑に。API GatewayやBasic Authで二重保護も可。