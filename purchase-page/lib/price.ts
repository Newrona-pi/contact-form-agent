// プラン別単価（税込）
export const PLAN_PRICES = {
  "ONE_TIME": 29800, // ¥29,800/seat
  "MONTHLY": 1980,   // ¥1,980/seat
  "ANNUAL": 19800,   // ¥19,800/seat
} as const;

export type PlanType = keyof typeof PLAN_PRICES;

// フォームの値からデータベースの値に変換
export function convertFormPlanToDbPlan(formPlan: string): PlanType {
  switch (formPlan) {
    case "one_time":
      return "ONE_TIME";
    case "monthly":
      return "MONTHLY";
    case "annual":
      return "ANNUAL";
    default:
      return "ONE_TIME";
  }
}

// 料金計算関数（データベースの値用）
export function calculateTotalAmount(plan: PlanType, seats: number): number {
  const unitPrice = PLAN_PRICES[plan];
  return unitPrice * seats;
}

// 料金計算関数（フォームの値用）
export function calculateTotalAmountFromForm(formPlan: string, seats: number): number {
  const dbPlan = convertFormPlanToDbPlan(formPlan);
  return calculateTotalAmount(dbPlan, seats);
}

// 料金表示用フォーマット
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

// プラン名の日本語表示
export function getPlanDisplayName(plan: PlanType): string {
  switch (plan) {
    case "ONE_TIME":
      return "買い切り";
    case "MONTHLY":
      return "月額";
    case "ANNUAL":
      return "年額";
    default:
      return "不明";
  }
}

// プラン説明
export function getPlanDescription(plan: PlanType): string {
  switch (plan) {
    case "ONE_TIME":
      return "一度の支払いで永続利用可能";
    case "MONTHLY":
      return "月額課金、いつでも解約可能";
    case "ANNUAL":
      return "年額課金、2ヶ月分お得";
    default:
      return "";
  }
}
