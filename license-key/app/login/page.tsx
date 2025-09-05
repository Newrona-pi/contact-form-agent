'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, licenseKey: key })
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = '/tool';
    } else {
      const j = await res.json().catch(()=>({}));
      setError(j.error || 'ログインに失敗しました');
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">ライセンスログイン</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">メールアドレス</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">ライセンスキー</label>
          <input className="w-full border rounded px-3 py-2 font-mono" value={key} onChange={e=>setKey(e.target.value)} required placeholder="RP1-XXXX-XXXX.XXXX-XXXX-..." />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">{loading ? '送信中...' : 'ログイン'}</button>
      </form>
    </main>
  );
}
