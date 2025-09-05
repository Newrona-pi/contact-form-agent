import { purchaseFormSchema, isFreeEmailDomain } from "@/lib/zodSchemas";

describe("Zod schemas", () => {
  describe("purchaseFormSchema", () => {
    const validData = {
      company_name: "株式会社テスト",
      contact_name: "田中太郎",
      email: "tanaka@example.com",
      phone: "03-1234-5678",
      billing_name: "株式会社テスト",
      payment_method: "credit" as const,
      plan: "one_time" as const,
      seats: 5,
      agree_tos: true,
    };

    it("should validate correct data", () => {
      const result = purchaseFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should require company_name", () => {
      const data = { ...validData, company_name: "" };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("会社名を入力してください");
      }
    });

    it("should require contact_name", () => {
      const data = { ...validData, contact_name: "" };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("担当者名を入力してください");
      }
    });

    it("should validate email format", () => {
      const data = { ...validData, email: "invalid-email" };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("有効なメールアドレスを入力してください");
      }
    });

    it("should validate phone format", () => {
      const data = { ...validData, phone: "123" };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("有効な電話番号を入力してください（8-20文字）");
      }
    });

    it("should validate seats range", () => {
      const data = { ...validData, seats: 0 };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("席数は1以上を入力してください");
      }
    });

    it("should validate seats maximum", () => {
      const data = { ...validData, seats: 1001 };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("席数は1000以下を入力してください");
      }
    });

    it("should require agree_tos", () => {
      const data = { ...validData, agree_tos: false };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("利用規約に同意してください");
      }
    });

    it("should validate tax_id format", () => {
      const data = { ...validData, tax_id: "invalid-tax-id" };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("有効なインボイス登録番号を入力してください（Tで始まる8-20文字）");
      }
    });

    it("should validate notes length", () => {
      const data = { ...validData, notes: "a".repeat(501) };
      const result = purchaseFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("備考は500文字以内で入力してください");
      }
    });
  });

  describe("isFreeEmailDomain", () => {
    it("should detect Gmail", () => {
      expect(isFreeEmailDomain("test@gmail.com")).toBe(true);
    });

    it("should detect Yahoo", () => {
      expect(isFreeEmailDomain("test@yahoo.co.jp")).toBe(true);
    });

    it("should detect Hotmail", () => {
      expect(isFreeEmailDomain("test@hotmail.com")).toBe(true);
    });

    it("should not detect corporate emails", () => {
      expect(isFreeEmailDomain("test@example.com")).toBe(false);
      expect(isFreeEmailDomain("test@company.co.jp")).toBe(false);
    });

    it("should handle case insensitive", () => {
      expect(isFreeEmailDomain("test@GMAIL.COM")).toBe(true);
    });
  });
});
