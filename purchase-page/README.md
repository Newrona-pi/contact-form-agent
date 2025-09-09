# FormAutoFiller Pro - 法人向けソフトウェア販売フロー

Next.js 14 + TypeScript + Firebase + Stripe + Resend を使用した法人向けソフトウェア販売システムです。

## 機能

- **ステップ式フォーム入力**: 5つのセクションに分かれた直感的な入力フォーム
- **決済処理**: クレジットカード決済（Stripe）と請求書払いの両方に対応
- **ライセンス管理**: 自動ライセンスキー生成と検証
- **メール送信**: 申込控え、ライセンス発行、請求書送付の自動メール
- **セキュリティ**: レート制限、ハニーポット、CSRF保護
- **管理機能**: 入金反映とライセンス発行の管理API

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **バックエンド**: Next.js API Routes, Firebase
- **データベース**: Firebase Firestore
- **決済**: Stripe
- **メール**: Resend
- **フォーム**: React Hook Form + Zod
- **テスト**: Jest (ユニット), Playwright (E2E)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd purchase-page
```

### 2. 依存関係のインストール

```bash
npm install
# または
pnpm install
```

### 3. 環境変数の設定

```bash
cp env.example .env.local
```

`.env.local` ファイルを編集し、必要な値を設定してください：

```env
# Firebase
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Resend)
RESEND_API_KEY="re_..."

# Admin
ADMIN_TOKEN="your-secure-admin-token-here"

# License
LICENSE_SECRET="your-license-secret-key-here"
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使用方法

### フォーム入力フロー

1. `/purchase` - 5ステップのフォーム入力
   - 会社情報
   - 担当者情報
   - 請求関連
   - 契約・利用
   - その他

2. `/purchase/confirm` - 入力内容の確認

3. `/purchase/thanks` - 完了ページ（支払い方法により表示が異なる）

### 支払い方法

#### クレジットカード決済
- Stripe PaymentIntentを使用
- 決済完了後、自動でライセンスキーを発行
- ライセンスキーをメールで送信

#### 請求書払い
- 見積書PDFを生成
- 請求書をメールで送信
- 入金確認後、管理APIでライセンス発行

## API エンドポイント

### 注文関連
- `POST /api/orders` - 注文作成（Firebase用に再実装予定）
- `GET /api/orders` - 注文一覧（開発用、Firebase用に再実装予定）
- `GET /api/orders/[id]` - 注文詳細（Firebase用に再実装予定）

### 決済関連
- `POST /api/checkout` - Stripe PaymentIntent作成（Firebase用に再実装予定）
- `POST /api/webhooks/stripe` - Stripe Webhook処理（Firebase用に再実装予定）

### 請求書関連
- `POST /api/quotes` - 見積書PDF生成（Firebase用に再実装予定）

### ライセンス関連
- `POST /api/licenses/verify` - ライセンスキー検証（Firebase用に再実装予定）

### 管理API
- `POST /api/admin/orders/[id]/mark-paid` - 入金反映→ライセンス発行（Firebase用に再実装予定）

## テスト

### ユニットテスト

```bash
npm test
```

### E2Eテスト

```bash
# テスト実行
npm run test:e2e

# テスト結果の確認
npx playwright show-report
```

## デプロイ

### Vercel（推奨）

1. Vercelにプロジェクトをインポート
2. 環境変数を設定
3. データベースをセットアップ（本番ではPostgreSQLを推奨）
4. デプロイ

### その他のプラットフォーム

- Railway
- Render
- AWS
- Google Cloud Platform

## セキュリティ機能

- **レート制限**: 1分間に10リクエストまで
- **ハニーポット**: ボット対策
- **送信時間制限**: 最低3秒の送信間隔
- **CSRF保護**: HTTPメソッドとOriginチェック
- **個人情報マスキング**: ログでの個人情報保護

## 料金設定

- **買い切り**: ¥29,800/席
- **月額**: ¥1,980/席
- **年額**: ¥19,800/席

## 今後の拡張予定

- [ ] 税計算の実装
- [ ] 多言語対応
- [ ] 管理画面の拡張
- [ ] 請求書PDFの正式実装
- [ ] 顧客ポータル
- [ ] サブスクリプション管理

## トラブルシューティング

### よくある問題

1. **Firebase接続エラー**
   - `FIREBASE_PROJECT_ID` が正しく設定されているか確認
   - Firebase認証情報が正しく設定されているか確認

2. **Stripe決済エラー**
   - `STRIPE_SECRET_KEY` が正しく設定されているか確認
   - テストキーを使用しているか確認

3. **メール送信エラー**
   - `RESEND_API_KEY` が正しく設定されているか確認
   - Resendのドメイン設定を確認

### ログの確認

```bash
# 開発環境でのログ確認
npm run dev

# 本番環境でのログ確認（Vercelの場合）
vercel logs
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## サポート

ご質問やサポートが必要な場合は、以下までお問い合わせください：

- Email: support@formautofiller-pro.com
- GitHub Issues: [リポジトリのIssuesページ]

---

**注意**: このシステムはサンプル実装です。本番環境で使用する前に、セキュリティ要件を満たしているか十分に確認してください。
