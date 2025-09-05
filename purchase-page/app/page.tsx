import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FormAutoFiller Pro</h1>
              <p className="text-gray-600">法人向けフォーム自動入力ソリューション</p>
            </div>
            <Link href="/purchase">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                お申し込み
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            フォーム入力業務を<br />
            <span className="text-blue-600">自動化</span>しませんか？
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            FormAutoFiller Proは、企業のフォーム入力業務を効率化する
            法人向けソリューションです。手作業による入力ミスを削減し、
            業務効率を大幅に向上させます。
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/purchase">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                今すぐ始める
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              デモを見る
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            主な機能
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>自動入力</CardTitle>
                <CardDescription>
                  事前に登録したデータを基に、フォームを自動で入力します
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 顧客情報の自動入力</li>
                  <li>• 商品情報の自動選択</li>
                  <li>• 計算項目の自動算出</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>エラー防止</CardTitle>
                <CardDescription>
                  入力ミスを防ぎ、データの正確性を向上させます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 入力値の自動検証</li>
                  <li>• 必須項目のチェック</li>
                  <li>• フォーマットの統一</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>効率化</CardTitle>
                <CardDescription>
                  作業時間を大幅に短縮し、生産性を向上させます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 作業時間の90%削減</li>
                  <li>• 24時間365日の稼働</li>
                  <li>• 複数フォームの同時処理</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 bg-white">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            料金プラン
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>買い切り</CardTitle>
                <CardDescription>一度の支払いで永続利用可能</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">¥29,800<span className="text-lg text-gray-600">/席</span></div>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• 永続利用可能</li>
                  <li>• アップデート無料</li>
                  <li>• サポート1年間</li>
                </ul>
                <Link href="/purchase">
                  <Button className="w-full">選択する</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-blue-500">
              <CardHeader>
                <CardTitle className="text-blue-600">月額</CardTitle>
                <CardDescription>月額課金、いつでも解約可能</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">¥1,980<span className="text-lg text-gray-600">/席</span></div>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• 月額課金</li>
                  <li>• いつでも解約可能</li>
                  <li>• サポート付き</li>
                </ul>
                <Link href="/purchase">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">選択する</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>年額</CardTitle>
                <CardDescription>年額課金、2ヶ月分お得</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">¥19,800<span className="text-lg text-gray-600">/席</span></div>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• 年額課金</li>
                  <li>• 2ヶ月分お得</li>
                  <li>• 優先サポート</li>
                </ul>
                <Link href="/purchase">
                  <Button className="w-full">選択する</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            今すぐ始めませんか？
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            無料トライアルで、FormAutoFiller Proの効果を実感してください
          </p>
          <Link href="/purchase">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              無料で始める
            </Button>
          </Link>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 FormAutoFiller Pro. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
