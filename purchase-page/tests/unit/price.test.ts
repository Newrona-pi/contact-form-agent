import { calculateTotalAmount, calculateTotalAmountFromForm, formatPrice, getPlanDisplayName, convertFormPlanToDbPlan } from "@/lib/price";

describe("Price calculations", () => {
  describe("calculateTotalAmount", () => {
    it("should calculate one-time plan correctly", () => {
      const result = calculateTotalAmount("ONE_TIME", 5);
      expect(result).toBe(29800 * 5); // 149,000
    });

    it("should calculate monthly plan correctly", () => {
      const result = calculateTotalAmount("MONTHLY", 10);
      expect(result).toBe(1980 * 10); // 19,800
    });

    it("should calculate annual plan correctly", () => {
      const result = calculateTotalAmount("ANNUAL", 3);
      expect(result).toBe(19800 * 3); // 59,400
    });

    it("should handle single seat", () => {
      const result = calculateTotalAmount("ONE_TIME", 1);
      expect(result).toBe(29800);
    });
  });

  describe("calculateTotalAmountFromForm", () => {
    it("should calculate one-time plan correctly", () => {
      const result = calculateTotalAmountFromForm("one_time", 5);
      expect(result).toBe(29800 * 5); // 149,000
    });

    it("should calculate monthly plan correctly", () => {
      const result = calculateTotalAmountFromForm("monthly", 10);
      expect(result).toBe(1980 * 10); // 19,800
    });

    it("should calculate annual plan correctly", () => {
      const result = calculateTotalAmountFromForm("annual", 3);
      expect(result).toBe(19800 * 3); // 59,400
    });
  });

  describe("convertFormPlanToDbPlan", () => {
    it("should convert form plan to database plan", () => {
      expect(convertFormPlanToDbPlan("one_time")).toBe("ONE_TIME");
      expect(convertFormPlanToDbPlan("monthly")).toBe("MONTHLY");
      expect(convertFormPlanToDbPlan("annual")).toBe("ANNUAL");
    });
  });

  describe("formatPrice", () => {
    it("should format price in Japanese yen", () => {
      expect(formatPrice(29800)).toBe("¥29,800");
      expect(formatPrice(1980)).toBe("¥1,980");
      expect(formatPrice(19800)).toBe("¥19,800");
    });

    it("should handle large numbers", () => {
      expect(formatPrice(1000000)).toBe("¥1,000,000");
    });
  });

  describe("getPlanDisplayName", () => {
    it("should return correct Japanese names", () => {
      expect(getPlanDisplayName("ONE_TIME")).toBe("買い切り");
      expect(getPlanDisplayName("MONTHLY")).toBe("月額");
      expect(getPlanDisplayName("ANNUAL")).toBe("年額");
    });
  });
});
