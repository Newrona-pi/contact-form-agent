あなたは「法人向けソフトウェア販売フロー」の実装を行うシニアフルスタックエンジニアです。  
Next.js 14(App Router) + TypeScript + Prisma(PostgreSQL) + Tailwind + shadcn/ui + React Hook Form + Zod + Stripe + Resend を使い、**フォーム入力(ステップ式) → 確認ページ → 完了(サンクス) → バックエンド処理(決済/見積/請求/ライセンス発行)** までの一連の実装を、動くコード一式（ディレクトリ構成、全ファイル）で出力してください。  
対象プロダクト名は仮で **「FormAutoFiller Pro」** とします。UI文言は日本語、タイムゾーンは **Asia/Tokyo** でお願いします。

# 要求（最重要）
- フロー対象はランディングの次段階「フォーム入力から」。以下の5ステップを実装：
  1) /purchase：**ステップ式の入力フォーム**（会社/担当/請求/契約/その他）
  2) /purchase/confirm：**入力内容の確認ページ**
  3) /purchase/thanks：**サンクスページ（分岐：即時購入型/見積・請求書払い）**
  4) バックエンドAPI：**注文作成、決済意図の生成、見積PDFの生成、メール送信**
  5) **自動処理 or 事務局対応**：クレカは即時ライセンス発行、請求書払いは社内承認→支払い後にライセンス発行

- **Techスタックと制約**
  - Next.js 14 App Router、TypeScript strict
  - UI: Tailwind + shadcn/ui（Form/Input/Select/Checkbox/Alert/Dialog/Stepper相当は自作でもOK）
  - フォーム: React Hook Form + Zod（**日本語のエラーメッセージ**）
  - DB: Prisma + PostgreSQL（Dockerなしで動く前提／接続文字列はENV）
  - 決済: Stripe（即時購入のとき）
  - メール: Resend（Nodemailerをfallbackに可能な設計）
  - キャッシュ/Rate Limit: ミドルウェアで**簡易レート制限**（例：Upstash Redis or in-memory stub）
  - Bot/不正送信対策: **ハニーポット + タイムスタンプ検知**（reCAPTCHAはオプション化）
  - ログ: pino でサーバーログ（API/エラー）
  - タイムゾーン: dayjs + timezone で Asia/Tokyo

# 画面/ルーティング
- `/purchase`：入力ウィザード（5セクション／プログレスUI）
  - セクション1: **会社情報**
    - company_name(必須), company_kana(任意), department(任意), role(任意)
    - address_zip(任意), address_pref(任意), address_city(任意), address_line1(任意), address_line2(任意)
  - セクション2: **担当者情報**
    - contact_name(必須), contact_kana(任意), email(必須), phone(任意)
    - **emailはフリーメールドメイン(gmail.com, yahoo.co.jp 等)を警告**（ただし送信は許可）
  - セクション3: **請求関連**
    - billing_name(既定=company_name、編集可), billing_department(任意), billing_email(任意/推奨), 
    - tax_id(インボイス登録番号／任意), payment_method(必須: "credit"|"invoice")
  - セクション4: **契約/利用**
    - plan(必須: "one_time"|"monthly"|"annual"), seats(必須/1〜1000), start_date(任意)
    - use_case(任意: セレクト or テキスト)
  - セクション5: **その他**
    - referral_code(任意), notes(任意/500字以内), agree_tos(必須: 利用規約同意チェック)
- `/purchase/confirm`：入力値の**読み取り専用表示** + 「戻る/編集」, 「送信」
- `/purchase/thanks`：分岐表示
  - payment_method=credit の場合：**「決済完了→ライセンス発行」**のメッセージと受領メール案内
  - payment_method=invoice の場合：**「見積書/請求書送付」**と「入金確認後にライセンス発行」案内

# バリデーション（Zod）
- company_name: 非空
- contact_name: 非空
- email: RFC準拠 + **フリーメールドメイン警告**（UIでWarning表示）
- phone: `^[0-9+\\-()\\s]{8,20}$` 緩め
- seats: 整数 1〜1000
- plan: enum
- payment_method: enum
- agree_tos: true必須
- tax_id: `^T[0-9A-Z\\-]{8,20}$`程度（日本のインボイス番号フォーマットに緩く対応）
- notes: 最大500文字

# DBスキーマ（Prisma）
- Company(id, name, kana, department, role, address_zip, address_pref, address_city, address_line1, address_line2, createdAt)
- Contact(id, companyId(FK), name, kana, email(uniq+index), phone, createdAt)
- Order(id, companyId, contactId, plan(enum), seats(int), startDate(DateTime|null), useCase, referralCode, notes, paymentMethod(enum), status(enum: "draft"|"pending_payment"|"paid"|"cancelled"), totalAmount(int), currency(default "JPY"), createdAt)
- Invoice(id, orderId, number(uniq), pdfUrl, status(enum: "draft"|"sent"|"paid"|"void"), dueDate, createdAt)
- PaymentIntent(id, orderId, provider(enum:"stripe"), clientSecret, status, createdAt)
- License(id, orderId, key(uniq), status(enum:"active"|"inactive"|"revoked"), seats, issuedAt)
- WebhookEvent(id, provider, rawJson, createdAt)
- Unique/Index: contact.email, invoice.number, license.key

# 料金計算（簡易）
- planごとに単価を仮決め（one_time: ¥29,800/seat, monthly: ¥1,980/seat, annual: ¥19,800/seat）
- totalAmount = 単価 × seats（税は本サンプルでは内税処理でOK／拡張余地コメントをコードに）


# メール（Resend）
- 送信タイミング：
  - フォーム送信直後：申込控え（申込内容+次ステップ）
  - payment_method=credit：決済成功→ライセンス発行メール（キー、席数、開始方法）
  - payment_method=invoice：見積PDF/請求案内メール（請求先/billing_emailがあればCC）
- /emails/templates/ にTSXテンプレート（日本語）。プレーンHTMLのfallbackも用意。

# 見積PDF
- /api/quotes：POSTで orderId を受け、pdfkit等で簡易見積PDFを生成し一時URLに保存（/public/tmpでも可）。サンプルとして**日本語フォント埋め込み**不要の体裁でOK（テキストのみ）。PDFファイル名は `QUO-<invoice.number>.pdf`。

# 決済（Stripe）
- /api/checkout：POSTで orderId を受け、Stripe PaymentIntent作成→clientSecret返却
- フロントはclientSecretを使って決済完了
- /api/webhooks/stripe：決済成功イベントを受け、Order/Invoice/Licenseを更新
- サンプル用に **Stripe Payment Element** 実装（カードのみ）

# 事務局対応（請求書払い）
- /api/admin/orders/[id]/mark-paid：POSTで支払反映→Invoice.status=paid→License発行
- **簡易トークン認証**（`x-admin-token` ヘッダで process.env.ADMIN_TOKEN 照合）
- 将来的な管理画面拡張を見据えたコメントをコードに入れる

# セキュリティ/信頼性
- 送信制御：**honeyPot(hiddenフィールド)** と **min-submit-time(>=3秒)** を必須
- Rate Limit：/api以下に1分10回程度の簡易制限
- CSRF：App RouterのRoute HandlerでHTTPメソッド/Originチェック
- PII：ログには個人情報を残さないようマスク（メールは local-partの一部伏せる）
- Idempotency：注文作成APIは同一sessionId/emailで**重複作成を防止**

# UI/UX要件
- ステップごとに**Next/Back**、バリデーションは**即時**（onBlur）
- 確認ページはセクション毎の「編集」リンク
- エラー文言は**日本語**で簡潔（例：「会社名を入力してください」）
- キーボード操作/ARIA属性/フォーカストラップ配慮
- モバイル最適化（1カラム、タップ領域十分）

# テスト
- ユニット：Zodスキーマ、料金計算、ライセンス生成/検証
- E2E（Playwright）：フォーム入力→確認→送信→サンクスまでの分岐（credit/invoice）
- Webhookのモックテスト

# 出力物
1) ルートの**ディレクトリ構成**（木構造）
2) 主要ファイルの**完全なコード**（省略なし）
3) `.env.example`（必要なキー：DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, ADMIN_TOKEN, LICENSE_SECRET）
4) **README.md**（セットアップ/起動手順/テスト方法/注意点）
5) 将来拡張メモ（税計算、メール国際化、正式な請求PDF、管理画面）

# ディレクトリ例（生成時は必要に応じて微調整OK）
- app/
  - purchase/page.tsx（フォームウィザード）
  - purchase/confirm/page.tsx
  - purchase/thanks/page.tsx
  - api/orders/route.ts（POST: 作成, GET: 一覧(開発用)）
  - api/orders/[id]/route.ts（GET: 詳細）
  - api/checkout/route.ts（POST: Stripe PaymentIntent）
  - api/quotes/route.ts（POST: 見積PDF生成）
  - api/webhooks/stripe/route.ts（POST: Webhook）
  - api/licenses/verify/route.ts（POST: キー検証）
  - api/admin/orders/[id]/mark-paid/route.ts（POST: 入金反映→ライセンス発行）
- components/
  - Stepper.tsx, FormFields.tsx（セクション別に分割）
  - WarningFreeMail.tsx（フリーメールドメイン注意）
- lib/
  - zodSchemas.ts, price.ts, license.ts, rateLimit.ts, logger.ts, mailer.ts
- emails/templates/
  - ApplicationReceipt.tsx
  - LicenseIssued.tsx
  - InvoiceNotice.tsx
- prisma/
  - schema.prisma
- styles/
  - globals.css
- tests/
  - unit/…
  - e2e/…
- .env.example
- README.md

# 受入条件（必須）
- `pnpm i && pnpm dev` で開発サーバー起動（DBマイグレーション含む手順をREADMEに明記）
- `/purchase` から **5分で通し体験**が可能（ダミーStripeでも良い）
- Zodエラー文言/確認ページ/サンクスの**日本語文言**が自然
- `LICENSE_SECRET` を変えるとキー検証が失敗する（HMAC実装が効いている）
- E2Eテストで**credit/invoice両分岐**がグリーン

# 実装順序（生成の際はこの順に提示すると読みやすい）
1. prisma/schema.prisma とマイグレーション
2. lib（zodSchemas, price, license, logger, rateLimit, mailer）
3. API Route Handlers（orders, checkout, quotes, webhooks, licenses, admin）
4. フロント：フォームウィザード（セクション毎のコンポーネント）
5. 確認/サンクスページ
6. メールテンプレート
7. テスト
8. README と .env.example

**注意**：サンプルのためStripeやメールは「実行可能な最小構成」でOK。機微情報は必ずENV参照。日本語のフォームラベル/エラー/案内文を丁寧に。コードは**省略せず**完全出力してください。
