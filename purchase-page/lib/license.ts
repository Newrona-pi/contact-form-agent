import crypto from "crypto";

// ライセンスキー生成関数
export function generateLicenseKey(): string {
  // ランダムな32文字の文字列を生成
  const randomBytes = crypto.randomBytes(16);
  return randomBytes.toString("hex").toUpperCase();
}

// ライセンスキー検証用HMAC生成
export function generateLicenseHmac(key: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(key).digest("hex");
}

// ライセンスキー検証
export function verifyLicenseKey(key: string, hmac: string, secret: string): boolean {
  const expectedHmac = generateLicenseHmac(key, secret);
  return crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expectedHmac, "hex"));
}

// ライセンスキーフォーマット（表示用）
export function formatLicenseKey(key: string): string {
  // 8文字ずつに区切って表示
  return key.match(/.{1,8}/g)?.join("-") || key;
}

// ライセンスキー検索用（ハイフンなし）
export function normalizeLicenseKey(key: string): string {
  return key.replace(/-/g, "").toUpperCase();
}
