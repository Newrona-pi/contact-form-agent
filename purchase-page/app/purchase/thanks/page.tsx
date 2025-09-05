"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, Mail, CreditCard, FileText } from "lucide-react";
import { formatPrice, getPlanDisplayName, convertFormPlanToDbPlan } from "@/lib/price";

interface OrderData {
  id: string;
  company: {
    name: string;
  };
  contact: {
    name: string;
    email: string;
  };
  plan: string;
  seats: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  licenses?: Array<{
    key: string;
    seats: number;
    status: string;
  }>;
  invoices?: Array<{
    number: string;
    pdfUrl?: string;
    status: string;
  }>;
}

export default function ThanksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const type = searchParams.get("type"); // "credit" or "invoice"
  const invoiceNumber = searchParams.get("invoiceNumber");
  
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleDownloadInvoice = () => {
    if (orderData?.invoices?.[0]?.pdfUrl) {
      window.open(orderData.invoices[0].pdfUrl, "_blank");
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

  const isCreditPayment = orderData.paymentMethod === "CREDIT" || type === "credit";
  const isPaid = orderData.status === "PAID";
  const hasLicense = orderData.licenses && orderData.licenses.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            お申し込みありがとうございます
          </h1>
          <p className="text-gray-600">
            {orderData.contact.name} 様
          </p>
        </div>

        <div className="space-y-6">
          {/* 注文概要 */}
          <Card>
            <CardHeader>
              <CardTitle>注文概要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">注文番号</p>
                  <p className="font-medium">{orderData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">会社名</p>
                  <p className="font-medium">{orderData.company.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">プラン</p>
                  <p className="font-medium">
                    {getPlanDisplayName(convertFormPlanToDbPlan(orderData.plan))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">席数</p>
                  <p className="font-medium">{orderData.seats}席</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">合計金額</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ¥{orderData.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 支払い方法別の表示 */}
          {isCreditPayment ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  クレジットカード決済
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPaid && hasLicense ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-600">決済完了</span>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">ライセンスキーが発行されました</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-green-700">
                          <strong>ライセンスキー:</strong>
                        </p>
                        <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                          {orderData.licenses![0].key}
                        </div>
                        <p className="text-sm text-green-700">
                          利用可能席数: {orderData.licenses![0].seats}席
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">利用開始方法</h3>
                      <ol className="text-sm text-blue-700 space-y-1">
                        <li>1. FormAutoFiller Proアプリケーションをダウンロード</li>
                        <li>2. 上記のライセンスキーを入力</li>
                        <li>3. 利用開始</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="font-medium">決済処理中...</span>
                    </div>
                    <p className="text-gray-600">
                      決済が完了次第、ライセンスキーをメールでお送りいたします。
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  請求書払い
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPaid && hasLicense ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-600">入金確認完了</span>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">ライセンスキーが発行されました</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-green-700">
                          <strong>ライセンスキー:</strong>
                        </p>
                        <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                          {orderData.licenses![0].key}
                        </div>
                        <p className="text-sm text-green-700">
                          利用可能席数: {orderData.licenses![0].seats}席
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">見積書・請求書を送付いたします</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        請求書払いをご選択いただきました。見積書・請求書をメールでお送りいたします。
                      </p>
                      {orderData.invoices && orderData.invoices.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-blue-700">
                            <strong>請求書番号:</strong> {orderData.invoices[0].number}
                          </p>
                          {orderData.invoices[0].pdfUrl && (
                            <Button 
                              onClick={handleDownloadInvoice}
                              variant="outline" 
                              size="sm"
                              className="mt-2"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              請求書をダウンロード
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2">入金確認後の処理</h3>
                      <p className="text-sm text-yellow-700">
                        入金確認後、ライセンスキーをメールでお送りいたします。
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* メール送信案内 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                メール送信について
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">
                申込控えを <strong>{orderData.contact.email}</strong> に送信いたしました。
              </p>
              {isCreditPayment && isPaid && (
                <p className="text-gray-600">
                  ライセンスキーも同じメールアドレスに送信いたしました。
                </p>
              )}
              {!isCreditPayment && (
                <p className="text-gray-600">
                  見積書・請求書も同じメールアドレスに送信いたします。
                </p>
              )}
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="text-center pt-6">
            <Button 
              onClick={() => router.push("/purchase")}
              variant="outline"
            >
              新しい注文を作成
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
