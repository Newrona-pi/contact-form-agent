# ディレクトリ構造

```
purchase-page/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── admin/                # 管理API
│   │   │   └── orders/
│   │   │       └── [id]/
│   │   │           └── mark-paid/
│   │   │               └── route.ts
│   │   ├── checkout/             # 決済API
│   │   │   └── route.ts
│   │   ├── licenses/             # ライセンスAPI
│   │   │   └── verify/
│   │   │       └── route.ts
│   │   ├── orders/               # 注文API
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── quotes/               # 見積書API
│   │   │   └── route.ts
│   │   └── webhooks/             # Webhook
│   │       └── stripe/
│   │           └── route.ts
│   ├── purchase/                 # 購入フローページ
│   │   ├── confirm/
│   │   │   └── page.tsx
│   │   ├── thanks/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── globals.css               # グローバルスタイル
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # ホームページ
├── components/                   # Reactコンポーネント
│   ├── ui/                       # shadcn/uiコンポーネント
│   │   ├── alert.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── select.tsx
│   │   └── textarea.tsx
│   ├── FormFields.tsx            # フォームフィールド
│   ├── Stepper.tsx               # ステッパーコンポーネント
│   └── WarningFreeMail.tsx       # フリーメール警告
├── emails/                       # メールテンプレート
│   └── templates/
│       ├── ApplicationReceipt.tsx
│       ├── InvoiceNotice.tsx
│       └── LicenseIssued.tsx
├── lib/                          # ライブラリ・ユーティリティ
│   ├── license.ts                # ライセンス管理
│   ├── logger.ts                 # ログ管理
│   ├── mailer.ts                 # メール送信
│   ├── price.ts                  # 料金計算
│   ├── prisma.ts                 # Prismaクライアント
│   ├── rateLimit.ts              # レート制限
│   ├── utils.ts                  # ユーティリティ
│   └── zodSchemas.ts             # Zodスキーマ
├── prisma/                       # Prisma設定
│   └── schema.prisma             # データベーススキーマ
├── public/                       # 静的ファイル
│   └── tmp/                      # 一時ファイル（見積書PDF等）
├── tests/                        # テストファイル
│   ├── e2e/                      # E2Eテスト
│   │   └── purchase-flow.spec.ts
│   └── unit/                     # ユニットテスト
│       ├── license.test.ts
│       ├── price.test.ts
│       └── zodSchemas.test.ts
├── .env.example                  # 環境変数サンプル
├── DIRECTORY_STRUCTURE.md        # このファイル
├── README.md                     # プロジェクト説明
├── components.json               # shadcn/ui設定
├── jest.config.js                # Jest設定
├── jest.setup.js                 # Jestセットアップ
├── next.config.js                # Next.js設定
├── package.json                  # 依存関係
├── playwright.config.ts          # Playwright設定
├── postcss.config.js             # PostCSS設定
├── tailwind.config.js            # Tailwind設定
└── tsconfig.json                 # TypeScript設定
```

## 主要ファイルの説明

### API Routes
- `app/api/orders/` - 注文の作成・取得
- `app/api/checkout/` - Stripe決済処理
- `app/api/quotes/` - 見積書PDF生成
- `app/api/webhooks/stripe/` - Stripe Webhook処理
- `app/api/licenses/verify/` - ライセンスキー検証
- `app/api/admin/orders/[id]/mark-paid/` - 管理用入金反映

### ページ
- `app/page.tsx` - ランディングページ
- `app/purchase/page.tsx` - フォーム入力ウィザード
- `app/purchase/confirm/page.tsx` - 確認ページ
- `app/purchase/thanks/page.tsx` - サンクスページ

### コンポーネント
- `components/FormFields.tsx` - セクション別フォームフィールド
- `components/Stepper.tsx` - 進捗表示
- `components/WarningFreeMail.tsx` - フリーメール警告
- `components/ui/` - shadcn/uiベースのUIコンポーネント

### ライブラリ
- `lib/zodSchemas.ts` - フォームバリデーション
- `lib/price.ts` - 料金計算
- `lib/license.ts` - ライセンス管理
- `lib/mailer.ts` - メール送信
- `lib/rateLimit.ts` - レート制限
- `lib/logger.ts` - ログ管理

### データベース
- `prisma/schema.prisma` - データベーススキーマ定義

### テスト
- `tests/unit/` - ユニットテスト
- `tests/e2e/` - E2Eテスト
