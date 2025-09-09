# Firestore データベース設計

## コレクション構造

### 1. orders (注文)
```typescript
interface Order {
  id: string; // 自動生成
  company: {
    name: string;
    department?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
    city?: string;
    prefecture?: string;
  };
  contact: {
    name: string;
    email: string;
    phone?: string;
    position?: string;
  };
  billing: {
    name?: string;
    department?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
    city?: string;
    prefecture?: string;
  };
  plan: 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';
  seats: number;
  totalAmount: number;
  paymentMethod: 'CREDIT' | 'INVOICE';
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. paymentIntents (決済意図)
```typescript
interface PaymentIntent {
  id: string; // 自動生成
  orderId: string; // ordersコレクションへの参照
  provider: 'STRIPE';
  clientSecret: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3. invoices (請求書)
```typescript
interface Invoice {
  id: string; // 自動生成
  orderId: string; // ordersコレクションへの参照
  number: string; // 請求書番号
  pdfUrl?: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  dueDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. licenses (ライセンス)
```typescript
interface License {
  id: string; // 自動生成
  orderId: string; // ordersコレクションへの参照
  key: string; // ライセンスキー
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  seats: number;
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5. webhookEvents (Webhookイベント)
```typescript
interface WebhookEvent {
  id: string; // 自動生成
  provider: 'stripe';
  rawJson: string; // JSON文字列
  processed: boolean;
  createdAt: Timestamp;
}
```

## インデックス設計

### 複合インデックス
- `orders`: `status` + `createdAt`
- `orders`: `paymentMethod` + `status`
- `paymentIntents`: `orderId` + `status`
- `invoices`: `orderId` + `status`
- `licenses`: `orderId` + `status`

### 単一フィールドインデックス
- `orders.contact.email`
- `licenses.key`
- `invoices.number`

## セキュリティルール（例）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 注文データは認証されたユーザーのみアクセス可能
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
    
    // ライセンスデータは管理者のみアクセス可能
    match /licenses/{licenseId} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## データ移行戦略

1. **段階的移行**: 既存のPrismaデータをFirestoreに移行
2. **バックアップ**: 移行前にデータのバックアップを作成
3. **検証**: 移行後のデータ整合性を確認
4. **ロールバック**: 問題発生時の復旧手順を準備
