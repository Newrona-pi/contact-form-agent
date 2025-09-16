"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatPrice, getPlanDisplayName, convertFormPlanToDbPlan } from "@/lib/price";
import { ArrowLeft, Edit, CheckCircle, MailCheck } from "lucide-react";

interface OrderData {
  id: string;
  company: {
    name: string;
    kana?: string;
    department?: string;
    role?: string;
    addressZip?: string;
    addressPref?: string;
    addressCity?: string;
    addressLine1?: string;
    addressLine2?: string;
  };
  contact: {
    name: string;
    kana?: string;
    email: string;
    phone?: string;
  };
  plan: string;
  seats: number;
  startDate?: string;
  useCase?: string;
  referralCode?: string;
  notes?: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
}

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const paymentMethod = searchParams.get("paymentMethod");
  
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    } else {
      router.push("/purchase");
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      
      if (data.order) {
        setOrderData(data.order);
      } else {
        router.push("/purchase");
      }
    } catch (error) {
      console.error("注文データの取得に失敗:", error);
      router.push("/purchase");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push("/purchase");
  };

  const handleProceed = async () => {
    if (!orderData) return;
    
    setIsProcessing(true);
    
    try {
      if (paymentMethod === "credit") {
        // クレジットカード決済の場合
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId: orderData.id }),
        });
        
        const result = await response.json();
        
        if (result.clientSecret) {
          // Stripe決済ページに遷移（実際の実装ではStripe Elementsを使用）
          router.push(`/purchase/payment?clientSecret=${result.clientSecret}&orderId=${orderData.id}`);
        } else {
          alert("決済処理の開始に失敗しました");
        }
      } else {
        // 請求書払いの場合
        const response = await fetch("/api/quotes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId: orderData.id }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          router.push(`/purchase/thanks?orderId=${orderData.id}&type=invoice&invoiceNumber=${result.invoiceNumber}`);
        } else {
          alert("見積書の生成に失敗しました");
        }
      }
    } catch (error) {
      console.error("処理エラー:", error);
      alert("処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>注文内容を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>注文データが見つかりません</p>
          <Button onClick={() => router.push("/purchase")} className="mt-4">
            フォームに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            注文内容の確認
          </h1>
          <p className="text-gray-600">
            以下の内容でお間違いないかご確認ください
          </p>
        </div>

        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          <MailCheck className="h-5 w-5 text-green-600" />
          <AlertTitle>購入が完了しました</AlertTitle>
          <AlertDescription>
            <p className="mb-1">お申し込み内容を受け付けました。</p>
            <p>
              ライセンスキーは登録されたメールアドレス（
              <span className="font-semibold">{orderData.contact.email}</span>
              ）にお送りいたします。
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* 会社情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                会社情報
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>会社名:</strong> {orderData.company.name}</p>
              {orderData.company.kana && <p><strong>会社名（カナ）:</strong> {orderData.company.kana}</p>}
              {orderData.company.department && <p><strong>部署:</strong> {orderData.company.department}</p>}
              {orderData.company.role && <p><strong>役職:</strong> {orderData.company.role}</p>}
              {(orderData.company.addressLine1 || orderData.company.addressLine2) && (
                <div>
                  <strong>住所:</strong>
                  <p className="ml-4">
                    {orderData.company.addressZip && `〒${orderData.company.addressZip} `}
                    {orderData.company.addressPref && orderData.company.addressCity && 
                      `${orderData.company.addressPref}${orderData.company.addressCity}`}
                    {orderData.company.addressLine1 && <br />}
                    {orderData.company.addressLine1}
                    {orderData.company.addressLine2 && <br />}
                    {orderData.company.addressLine2}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 担当者情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                担当者情報
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>担当者名:</strong> {orderData.contact.name}</p>
              {orderData.contact.kana && <p><strong>担当者名（カナ）:</strong> {orderData.contact.kana}</p>}
              <p><strong>メールアドレス:</strong> {orderData.contact.email}</p>
              {orderData.contact.phone && <p><strong>電話番号:</strong> {orderData.contact.phone}</p>}
            </CardContent>
          </Card>

          {/* 契約・利用情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                契約・利用情報
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>プラン:</strong> {getPlanDisplayName(convertFormPlanToDbPlan(orderData.plan))}</p>
              <p><strong>席数:</strong> {orderData.seats}席</p>
              {orderData.startDate && <p><strong>利用開始日:</strong> {new Date(orderData.startDate).toLocaleDateString("ja-JP")}</p>}
              {orderData.useCase && <p><strong>利用用途:</strong> {orderData.useCase}</p>}
              {orderData.referralCode && <p><strong>紹介コード:</strong> {orderData.referralCode}</p>}
              {orderData.notes && <p><strong>備考:</strong> {orderData.notes}</p>}
            </CardContent>
          </Card>

          {/* 支払い情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                支払い情報
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span><strong>支払い方法:</strong></span>
                <Badge variant={paymentMethod === "credit" ? "default" : "secondary"}>
                  {paymentMethod === "credit" ? "クレジットカード" : "請求書払い"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span><strong>合計金額:</strong></span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatPrice(orderData.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={handleEdit}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              フォームに戻る
            </Button>

            <Button
              onClick={handleProceed}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="proceed-button"
            >
              {isProcessing ? (
                "処理中..."
              ) : paymentMethod === "credit" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  決済に進む
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  見積書を生成
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
