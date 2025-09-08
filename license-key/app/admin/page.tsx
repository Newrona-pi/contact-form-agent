"use client";

import { useFormState } from "react-dom";
import type { State } from "./actions";
import { issueLicenseAction } from "./actions";

const initialState: State = { ok: false, message: "" };

export default function AdminPage() {
  const [state, formAction] = useFormState(issueLicenseAction, initialState);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ライセンス発行（管理）</h1>

      <form action={formAction} className="space-y-4 border rounded p-4">
        <div>
          <label className="block text-sm mb-1">メールアドレス</label>
          <input
            type="email"
            name="email"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">プラン</label>
          <select
            name="plan"
            defaultValue="basic"
            className="w-full border rounded px-3 py-2"
          >
            <option value="basic">basic</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">アクティベーション上限</label>
          <input
            type="number"
            name="activationLimit"
            min={1}
            max={10}
            defaultValue={1}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button type="submit" className="border rounded px-4 py-2">
          発行する
        </button>
      </form>

      {state.message && <p className="mt-4 text-sm">{state.message}</p>}
      <p className="text-sm text-gray-500 mt-4">
        注意: このページはサーバーに <code>ADMIN_TOKEN</code> が設定されている前提で内部 API を呼び出します。
      </p>
    </main>
  );
}

