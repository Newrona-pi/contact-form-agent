import { generateLicenseKey, verifyLicenseKey, formatLicenseKey, normalizeLicenseKey } from "@/lib/license";

describe("License utilities", () => {
  describe("generateLicenseKey", () => {
    it("should generate a 32-character hex string", () => {
      const key = generateLicenseKey();
      expect(key).toHaveLength(32);
      expect(key).toMatch(/^[0-9A-F]+$/);
    });

    it("should generate unique keys", () => {
      const key1 = generateLicenseKey();
      const key2 = generateLicenseKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("verifyLicenseKey", () => {
    it("should verify correct HMAC", () => {
      const key = "1234567890ABCDEF1234567890ABCDEF";
      const secret = "test-secret";
      const hmac = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";
      
      // 実際のHMAC生成（テスト用）
      const crypto = require("crypto");
      const expectedHmac = crypto.createHmac("sha256", secret).update(key).digest("hex");
      
      expect(verifyLicenseKey(key, expectedHmac, secret)).toBe(true);
    });

    it("should reject incorrect HMAC", () => {
      const key = "1234567890ABCDEF1234567890ABCDEF";
      const secret = "test-secret";
      const wrongHmac = "wrong-hmac";
      
      expect(verifyLicenseKey(key, wrongHmac, secret)).toBe(false);
    });
  });

  describe("formatLicenseKey", () => {
    it("should format key with hyphens", () => {
      const key = "1234567890ABCDEF1234567890ABCDEF";
      const formatted = formatLicenseKey(key);
      expect(formatted).toBe("12345678-90ABCDEF-12345678-90ABCDEF");
    });

    it("should handle shorter keys", () => {
      const key = "12345678";
      const formatted = formatLicenseKey(key);
      expect(formatted).toBe("12345678");
    });
  });

  describe("normalizeLicenseKey", () => {
    it("should remove hyphens and convert to uppercase", () => {
      const key = "12345678-90abcdef-12345678-90abcdef";
      const normalized = normalizeLicenseKey(key);
      expect(normalized).toBe("1234567890ABCDEF1234567890ABCDEF");
    });

    it("should handle already normalized keys", () => {
      const key = "1234567890ABCDEF1234567890ABCDEF";
      const normalized = normalizeLicenseKey(key);
      expect(normalized).toBe("1234567890ABCDEF1234567890ABCDEF");
    });
  });
});
