"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { WarningFreeMail } from "./WarningFreeMail";
import { PurchaseFormData } from "@/lib/zodSchemas";

interface FormFieldsProps {
  section: number;
}

export function FormFields({ section }: FormFieldsProps) {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<PurchaseFormData>();
  const watchedEmail = watch("email");
  const watchedCompanyName = watch("company_name");
  const watchedPaymentMethod = watch("payment_method");

  // セクション1: 会社情報
  if (section === 1) {
    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="company_name">会社名 *</Label>
          <Input
            id="company_name"
            data-testid="company_name"
            {...register("company_name")}
            placeholder="株式会社サンプル"
          />
          {errors.company_name && (
            <p className="text-sm text-red-600 mt-1">{errors.company_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="company_kana">会社名（カナ）</Label>
          <Input
            id="company_kana"
            {...register("company_kana")}
            placeholder="カブシキガイシャサンプル"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="department">部署名</Label>
            <Input
              id="department"
              {...register("department")}
              placeholder="営業部"
            />
          </div>
          <div>
            <Label htmlFor="role">役職</Label>
            <Input
              id="role"
              {...register("role")}
              placeholder="部長"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">住所情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="address_zip">郵便番号</Label>
              <Input
                id="address_zip"
                {...register("address_zip")}
                placeholder="100-0001"
              />
            </div>
            <div>
              <Label htmlFor="address_pref">都道府県</Label>
              <Input
                id="address_pref"
                {...register("address_pref")}
                placeholder="東京都"
              />
            </div>
            <div>
              <Label htmlFor="address_city">市区町村</Label>
              <Input
                id="address_city"
                {...register("address_city")}
                placeholder="千代田区"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address_line1">住所1</Label>
            <Input
              id="address_line1"
              {...register("address_line1")}
              placeholder="丸の内1-1-1"
            />
          </div>
          <div>
            <Label htmlFor="address_line2">住所2</Label>
            <Input
              id="address_line2"
              {...register("address_line2")}
              placeholder="サンプルビル5F"
            />
          </div>
        </div>
      </div>
    );
  }

  // セクション2: 担当者情報
  if (section === 2) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contact_name">担当者名 *</Label>
            <Input
              id="contact_name"
              data-testid="contact_name"
              {...register("contact_name")}
              placeholder="田中太郎"
            />
            {errors.contact_name && (
              <p className="text-sm text-red-600 mt-1">{errors.contact_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="contact_kana">担当者名（カナ）</Label>
            <Input
              id="contact_kana"
              {...register("contact_kana")}
              placeholder="タナカタロウ"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">メールアドレス *</Label>
          <Input
            id="email"
            data-testid="email"
            type="email"
            {...register("email")}
            placeholder="tanaka@example.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
          <WarningFreeMail email={watchedEmail} />
        </div>

        <div>
          <Label htmlFor="phone">電話番号</Label>
          <Input
            id="phone"
            data-testid="phone"
            {...register("phone")}
            placeholder="03-1234-5678"
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
          )}
        </div>
      </div>
    );
  }

  // セクション3: 請求関連
  if (section === 3) {
    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="billing_name">請求先名 *</Label>
          <Input
            id="billing_name"
            data-testid="billing_name"
            {...register("billing_name")}
            placeholder={watchedCompanyName || "請求先名を入力してください"}
          />
          {errors.billing_name && (
            <p className="text-sm text-red-600 mt-1">{errors.billing_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="billing_department">請求先部署</Label>
          <Input
            id="billing_department"
            {...register("billing_department")}
            placeholder="経理部"
          />
        </div>

        <div>
          <Label htmlFor="billing_email">請求先メールアドレス</Label>
          <Input
            id="billing_email"
            type="email"
            {...register("billing_email")}
            placeholder="billing@example.com"
          />
          {errors.billing_email && (
            <p className="text-sm text-red-600 mt-1">{errors.billing_email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="tax_id">インボイス登録番号</Label>
          <Input
            id="tax_id"
            {...register("tax_id")}
            placeholder="T1234567890123"
          />
          {errors.tax_id && (
            <p className="text-sm text-red-600 mt-1">{errors.tax_id.message}</p>
          )}
        </div>

        <div>
          <Label>支払い方法 *</Label>
          <Select
            value={watchedPaymentMethod}
            onValueChange={(value) => setValue("payment_method", value as "credit" | "invoice")}
          >
            <SelectTrigger data-testid="payment_method">
              <SelectValue placeholder="支払い方法を選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit">クレジットカード</SelectItem>
              <SelectItem value="invoice">請求書払い</SelectItem>
            </SelectContent>
          </Select>
          {errors.payment_method && (
            <p className="text-sm text-red-600 mt-1">{errors.payment_method.message}</p>
          )}
        </div>
      </div>
    );
  }

  // セクション4: 契約/利用
  if (section === 4) {
    return (
      <div className="space-y-6">
        <div>
          <Label>プラン *</Label>
          <Select
            value={watch("plan")}
            onValueChange={(value) => setValue("plan", value as "one_time" | "monthly" | "annual")}
          >
            <SelectTrigger data-testid="plan">
              <SelectValue placeholder="プランを選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">買い切り（¥29,800/席）</SelectItem>
              <SelectItem value="monthly">月額（¥1,980/席）</SelectItem>
              <SelectItem value="annual">年額（¥19,800/席）</SelectItem>
            </SelectContent>
          </Select>
          {errors.plan && (
            <p className="text-sm text-red-600 mt-1">{errors.plan.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="seats">席数 *</Label>
          <Input
            id="seats"
            data-testid="seats"
            type="number"
            min="1"
            max="1000"
            {...register("seats", { valueAsNumber: true })}
            placeholder="10"
          />
          {errors.seats && (
            <p className="text-sm text-red-600 mt-1">{errors.seats.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="start_date">利用開始日</Label>
          <Input
            id="start_date"
            type="date"
            {...register("start_date")}
          />
        </div>

        <div>
          <Label htmlFor="use_case">利用用途</Label>
          <Textarea
            id="use_case"
            data-testid="use_case"
            {...register("use_case")}
            placeholder="お客様のフォーム入力業務の自動化"
            rows={3}
          />
        </div>
      </div>
    );
  }

  // セクション5: その他
  if (section === 5) {
    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="referral_code">紹介コード</Label>
          <Input
            id="referral_code"
            data-testid="referral_code"
            {...register("referral_code")}
            placeholder="FRIEND2024"
          />
        </div>

        <div>
          <Label htmlFor="notes">備考</Label>
          <Textarea
            id="notes"
            data-testid="notes"
            {...register("notes")}
            placeholder="その他ご要望がございましたらご記入ください"
            rows={4}
          />
          {errors.notes && (
            <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>
          )}
        </div>

        <div className="flex items-start space-x-2">
          <Controller
            name="agree_tos"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="agree_tos"
                data-testid="agree_tos"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="agree_tos"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              利用規約に同意します *
            </Label>
            <p className="text-xs text-muted-foreground">
              <a href="/terms" className="underline" target="_blank" rel="noopener noreferrer">
                利用規約
              </a>
              を確認し、同意いたします。
            </p>
          </div>
        </div>
        {errors.agree_tos && (
          <p className="text-sm text-red-600">{errors.agree_tos.message}</p>
        )}
      </div>
    );
  }

  return null;
}
