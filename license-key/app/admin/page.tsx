"use server";

import React from "react";
import { revalidatePath } from "next/cache";

async function issueLicenseAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const plan = String(formData.get("plan") || "basic").trim();
  const activationLimit = Number(formData.get("activationLimit") || 1);

  if (!email) {
    return { ok: false, message: "メールアドレスを入力してください" };
  }

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return { ok: false, message: "サーバーにADMIN_TOKENが設定されていません" };
  }

  // 同一プロジェクト内の内部APIを呼ぶ（サーバー側からヘッダ付与）
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/admin/issue-license`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": adminToken,
    },
    body: JSON.stringify({ email, plan, activationLimit }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    return { ok: false, message: `発行に失敗しました: ${err?.error ?? res.statusText}` };
  }

  revalidatePath("/admin");
  return { ok: true, message: "ライセンスを発行しました（メール送信含む）" };
}

export default async function AdminPage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ライセンス発行（管理）</h1>

      <form action={issueLicenseAction} className="space-y-4 border rounded p-4">
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
          <select name="plan" defaultValue="basic" className="w-full border rounded px-3 py-2">
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

        <button type="submit" className="border rounded px-4 py-2">発行する</button>
      </form>

      <p className="text-sm text-gray-500 mt-4">
        注意: このページはADMIN_TOKENがサーバーに設定されている前提で内部APIを呼び出します。
      </p>
    </main>
  );
}


