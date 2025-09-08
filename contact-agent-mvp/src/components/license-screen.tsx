'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, AlertCircle } from 'lucide-react';

interface LicenseScreenProps {
  onLicenseValid: (key: string) => void;
}

export function LicenseScreen({ onLicenseValid }: LicenseScreenProps) {
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 新しいライセンス検証APIを呼び出し
      const response = await fetch('/api/auth/verify-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          licenseKey: licenseKey.trim(),
        }),
      });

      const result = await response.json();

      if (result.valid) {
        // ローカルストレージにライセンスキーを保存
        localStorage.setItem('contact-agent-license', licenseKey.trim());
        onLicenseValid(licenseKey.trim());
      } else {
        setError(result.message || '無効なライセンスキーです。正しいキーを入力してください。');
      }
    } catch (err) {
      console.error('License verification error:', err);
      setError('ライセンスの検証中にエラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            ライセンス認証
          </CardTitle>
          <CardDescription className="text-gray-600">
            ツールを使用するには有効なライセンスキーが必要です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="メールアドレスを入力してください"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-center text-lg"
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="ライセンスキーを入力してください"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="text-center text-lg font-mono"
                disabled={isLoading}
                required
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                isLoading || !email.trim() || !licenseKey.trim()
              }
            >
              {isLoading ? '認証中...' : '認証する'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ライセンスキーをお持ちでない場合は、管理者にお問い合わせください
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
