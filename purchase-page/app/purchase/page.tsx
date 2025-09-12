"use client";

import { useState, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { purchaseFormSchema, PurchaseFormData } from "@/lib/zodSchemas";
import { calculateTotalAmountFromForm, formatPrice } from "@/lib/price";
import { Stepper } from "@/components/Stepper";
import { FormFields } from "@/components/FormFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";

const STEPS = [
  "会社情報",
  "担当者情報", 
  "請求関連",
  "契約・利用",
  "その他"
];

export default function PurchasePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const formStartTimeRef = useRef(Date.now());

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      company_name: "",
      company_kana: "",
      department: "",
      role: "",
      address_zip: "",
      address_pref: "",
      address_city: "",
      address_line1: "",
      address_line2: "",
      contact_name: "",
      contact_kana: "",
      email: "",
      phone: "",
      billing_name: "",
      billing_department: "",
      billing_email: "",
      tax_id: "",
      payment_method: "credit",
      plan: "one_time",
      seats: 1,
      start_date: "",
      use_case: "",
      referral_code: "",
      notes: "",
      agree_tos: false,
    },
  });

  const { watch, trigger, formState: { errors } } = form;
  const watchedPlan = watch("plan");
  const watchedSeats = watch("seats");
  const watchedPaymentMethod = watch("payment_method");

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof PurchaseFormData)[] => {
    switch (step) {
      case 1:
        return ["company_name"];
      case 2:
        return ["contact_name", "email", "phone"];
      case 3:
        return ["billing_name", "payment_method"];
      case 4:
        return ["plan", "seats"];
      case 5:
        return ["agree_tos", "notes"];
      default:
        return [];
    }
  };

  const onSubmit = async (data: PurchaseFormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        company: {
          name: data.company_name,
          department: data.department,
          addressLine1: data.address_line1,
          addressLine2: data.address_line2,
          postalCode: data.address_zip,
          city: data.address_city,
          prefecture: data.address_pref,
        },
        contact: {
          name: data.contact_name,
          email: data.email,
          phone: data.phone,
          position: data.role,
        },
        billing: {
          name: data.billing_name,
          department: data.billing_department,
          addressLine1: data.address_line1,
          addressLine2: data.address_line2,
          postalCode: data.address_zip,
          city: data.address_city,
          prefecture: data.address_pref,
        },
        plan: data.plan.toUpperCase(),
        seats: data.seats,
        paymentMethod: data.payment_method.toUpperCase(),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // 確認ページに遷移
        router.push(`/purchase/confirm?orderId=${result.orderId}&paymentMethod=${result.paymentMethod}`);
      } else {
        alert(result.error || "送信に失敗しました");
      }
    } catch (error) {
      console.error("送信エラー:", error);
      alert("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = watchedPlan && watchedSeats 
    ? calculateTotalAmountFromForm(watchedPlan, watchedSeats)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            FormAutoFiller Pro お申し込み
          </h1>
          <p className="text-gray-600">
            法人向けフォーム自動入力ソリューション
          </p>
        </div>

        <div className="mb-8">
          <Stepper currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  ステップ {currentStep}: {STEPS[currentStep - 1]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormProvider {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FormFields section={currentStep} />
                  
                  <div className="flex justify-between mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 1}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      戻る
                    </Button>
                    
                    {currentStep < STEPS.length ? (
                      <Button type="button" data-testid="next-button" onClick={handleNext}>
                        次へ
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button type="submit" data-testid="submit-button" disabled={isSubmitting}>
                        {isSubmitting ? "送信中..." : "送信"}
                      </Button>
                    )}
                  </div>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>注文内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {watchedPlan && (
                  <div>
                    <p className="text-sm text-gray-600">プラン</p>
                    <p className="font-medium">
                      {watchedPlan === "one_time" ? "買い切り" : 
                       watchedPlan === "monthly" ? "月額" : "年額"}
                    </p>
                  </div>
                )}
                
                {watchedSeats && (
                  <div>
                    <p className="text-sm text-gray-600">席数</p>
                    <p className="font-medium">{watchedSeats}席</p>
                  </div>
                )}
                
                {watchedPaymentMethod && (
                  <div>
                    <p className="text-sm text-gray-600">支払い方法</p>
                    <p className="font-medium">
                      {watchedPaymentMethod === "credit" ? "クレジットカード" : "請求書払い"}
                    </p>
                  </div>
                )}
                
                {totalAmount > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-semibold">合計金額</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatPrice(totalAmount)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
