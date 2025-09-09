# License Key System - Firestore データベース設計

## コレクション構造

### 1. licenses (ライセンス)
```typescript
interface License {
  id: string; // 自動生成
  email: string;
  keyId: string; // 一意のキーID
  secretHash: string; // 暗号化されたシークレット
  plan: string; // 'basic', 'premium', 'enterprise'
  status: 'UNCLAIMED' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  activationLimit: number; // アクティベーション制限数
  activationCount: number; // 現在のアクティベーション数
  expiresAt?: Timestamp; // 期限（オプション）
  claimedAt?: Timestamp; // 初回アクティベーション日時
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. activations (アクティベーション)
```typescript
interface Activation {
  id: string; // 自動生成
  licenseId: string; // licensesコレクションへの参照
  device?: string; // デバイス情報
  ipHash?: string; // IPアドレスのハッシュ
  userAgent?: string; // ユーザーエージェント
  createdAt: Timestamp;
}
```

### 3. adminLogs (管理者ログ)
```typescript
interface AdminLog {
  id: string; // 自動生成
  action: 'ISSUE_LICENSE' | 'REVOKE_LICENSE' | 'UPDATE_LICENSE';
  licenseId?: string;
  email?: string;
  details: string; // アクションの詳細
  adminId: string; // 管理者ID
  createdAt: Timestamp;
}
```

## インデックス設計

### 複合インデックス
- `licenses`: `email` + `status`
- `licenses`: `keyId` + `status`
- `licenses`: `status` + `createdAt`
- `activations`: `licenseId` + `createdAt`

### 単一フィールドインデックス
- `licenses.email`
- `licenses.keyId`
- `licenses.status`
- `activations.licenseId`

## セキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ライセンスデータは管理者のみアクセス可能
    match /licenses/{licenseId} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // アクティベーションは認証されたユーザーのみ
    match /activations/{activationId} {
      allow read, write: if request.auth != null;
    }
    
    // 管理者ログは管理者のみ
    match /adminLogs/{logId} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## データ操作パターン

### ライセンス発行
1. 新しいライセンスドキュメントを作成
2. 管理者ログに記録
3. メール送信

### ライセンスアクティベーション
1. ライセンスキーで検索
2. ステータスとアクティベーション制限をチェック
3. アクティベーション記録を作成
4. ライセンスのアクティベーション数を更新

### ライセンス検証
1. ライセンスキーで検索
2. ステータス、期限、アクティベーション制限をチェック
3. 有効性を返す
