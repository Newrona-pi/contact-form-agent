'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onAuthenticated: (email: string) => void;
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result?.success) {
        onAuthenticated(email.trim());
      } else {
        setError(result?.error || result?.message || 'メールアドレスまたはパスワードが正しくありません。');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ログイン処理中にエラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            アカウントログイン
          </CardTitle>
          <CardDescription className="text-gray-600">
            ご登録のメールアドレスとパスワードでサインインしてください
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
                type="password"
                placeholder="パスワードを入力してください"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-center text-lg"
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
              disabled={isLoading || !email.trim() || !password.trim()}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ログイン情報は購入時に設定したメールアドレスとパスワードをご利用ください。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
