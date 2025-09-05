import { z } from "zod";

// フリーメールドメインのリスト
const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.co.jp",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yandex.com",
  "mail.ru",
  "protonmail.com",
  "tutanota.com",
  "zoho.com",
  "fastmail.com",
  "gmx.com",
  "web.de",
  "t-online.de"
];

// 会社情報スキーマ
export const companySchema = z.object({
  company_name: z.string().min(1, "会社名を入力してください"),
  company_kana: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  address_zip: z.string().optional(),
  address_pref: z.string().optional(),
  address_city: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
});

// 担当者情報スキーマ
export const contactSchema = z.object({
  contact_name: z.string().min(1, "担当者名を入力してください"),
  contact_kana: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください"),
  phone: z.string().regex(/^[0-9+\-()\s]{8,20}$/, "有効な電話番号を入力してください（8-20文字）").optional().or(z.literal("")),
});

// 請求関連スキーマ
export const billingSchema = z.object({
  billing_name: z.string().min(1, "請求先名を入力してください"),
  billing_department: z.string().optional(),
  billing_email: z.string().email("有効なメールアドレスを入力してください").optional().or(z.literal("")),
  tax_id: z.string().regex(/^T[0-9A-Z\-]{8,20}$/, "有効なインボイス登録番号を入力してください（Tで始まる8-20文字）").optional().or(z.literal("")),
  payment_method: z.enum(["credit", "invoice"], {
    required_error: "支払い方法を選択してください",
  }),
});

// 契約/利用スキーマ
export const contractSchema = z.object({
  plan: z.enum(["one_time", "monthly", "annual"], {
    required_error: "プランを選択してください",
  }),
  seats: z.number().int().min(1, "席数は1以上を入力してください").max(1000, "席数は1000以下を入力してください"),
  start_date: z.string().optional(),
  use_case: z.string().optional(),
});

// その他スキーマ
export const otherSchema = z.object({
  referral_code: z.string().optional(),
  notes: z.string().max(500, "備考は500文字以内で入力してください").optional(),
  agree_tos: z.boolean().refine((val) => val === true, "利用規約に同意してください"),
});

// 全体のフォームスキーマ
export const purchaseFormSchema = z.object({
  // セクション1: 会社情報
  ...companySchema.shape,
  // セクション2: 担当者情報
  ...contactSchema.shape,
  // セクション3: 請求関連
  ...billingSchema.shape,
  // セクション4: 契約/利用
  ...contractSchema.shape,
  // セクション5: その他
  ...otherSchema.shape,
});

// フリーメールドメイン検証関数
export function isFreeEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? FREE_EMAIL_DOMAINS.includes(domain) : false;
}

// フォームデータの型
export type PurchaseFormData = z.infer<typeof purchaseFormSchema>;
export type CompanyData = z.infer<typeof companySchema>;
export type ContactData = z.infer<typeof contactSchema>;
export type BillingData = z.infer<typeof billingSchema>;
export type ContractData = z.infer<typeof contractSchema>;
export type OtherData = z.infer<typeof otherSchema>;
