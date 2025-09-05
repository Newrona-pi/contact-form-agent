# ライセンスキー発行システム

このキットは「指定したメールアドレスへライセンスキーを送付し、そのキーでログインしてツールにアクセスさせる」最小構成です。

## 機能

- 管理者APIでライセンス発行 → メール送付
- ライセンスキー + メールで有効化 → JWTをHttpOnly Cookieにセット
- `/tool` を認証必須ページとして保護

## スタック

- Next.js (App Router)
- Prisma
- SQLite(デフォルト) / PostgreSQL(切替可)
- Nodemailer(SMTP)
- JWT認証

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の内容を設定してください：

```env
# DB
DATABASE_URL="file:./dev.db"

# 認証
JWT_SECRET="change_me_long_random"
ADMIN_TOKEN="change_admin_token"

# メール送信(SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="mailer@example.com"
SMTP_PASS="smtp_password"
SMTP_FROM="Your App <no-reply@example.com>"

# アプリ表示
APP_NAME="My License App"
APP_BASE_URL="http://localhost:3000"
```

### 3. データベースの初期化

```bash
npx prisma generate
npm run prisma:migrate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## 使用方法

### ライセンス発行

管理者APIを使用してライセンスを発行します：

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

### ログイン

1. 受信したメールに記載されたライセンスキーを確認
2. `/login` ページでメールアドレスとライセンスキーを入力
3. 認証成功後、`/tool` ページにアクセス可能

## ファイル構成

```
license-key/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── issue-license/
│   │   │       └── route.ts
│   │   └── auth/
│   │       ├── activate/
│   │       │   └── route.ts
│   │       └── logout/
│   │           └── route.ts
│   ├── login/
│   │   └── page.tsx
│   ├── tool/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── src/
│   └── lib/
│       ├── prisma.ts
│       ├── jwt.ts
│       ├── license.ts
│       └── mailer.ts
├── prisma/
│   └── schema.prisma
├── middleware.ts
├── package.json
└── README.md
```

## セキュリティ

- ライセンスキーは暗号化して保存
- JWTはHttpOnly Cookieで管理
- 管理者APIはトークン認証で保護
- アクティベーション制限で不正使用を防止

## カスタマイズ

- プラン別の制限設定
- 期限付きライセンス
- レート制限
- メールテンプレートのカスタマイズ
- データベースの切り替え（PostgreSQL等）
