"use client";

import { useFormState } from 'react-dom';
import type { State } from './actions';
import { issueLicenseAction } from './actions';

const initialState: State = { ok: false, message: '' };

export default function AdminPage() {
  const [state, formAction] = useFormState(issueLicenseAction, initialState);
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">ライセンス発行（管理）</h1>
      <form action={formAction} className="space-y-4 border rounded p-4">
        <div>
          <label className="block text-sm mb-1">メールアドレス</label>
          <input type="email" name="email" required className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">プラン</label>
          <input type="text" name="plan" defaultValue="basic" className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">アクティベーション上限</label>
          <input type="number" name="activationLimit" defaultValue="1" min="1" max="10" className="border rounded px-2 py-1 w-full" />
        </div>
        <button type="submit" className="border rounded px-3 py-2">発行</button>
      </form>
      {state.message && <p className="mt-4 text-sm">{state.message}</p>}
    </main>
  );
}

