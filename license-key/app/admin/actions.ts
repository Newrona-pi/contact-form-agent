'use server';

import { z } from 'zod';

interface State {
  ok: boolean;
  message: string;
}

const Schema = z.object({
  email: z.string().email(),
  plan: z.string().optional(),
  activationLimit: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().min(1).max(10).optional()),
});

export async function issueLicenseAction(_prevState: State, formData: FormData): Promise<State> {
  const parsed = Schema.safeParse({
    email: formData.get('email'),
    plan: formData.get('plan'),
    activationLimit: formData.get('activationLimit'),
  });

  if (!parsed.success) {
    return { ok: false, message: '入力値が不正です' };
  }

  const body = parsed.data;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/admin/issue-license`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': process.env.ADMIN_TOKEN ?? '',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, message: data.error ?? '発行に失敗しました' };
    }

    return { ok: true, message: 'ライセンスキーを発行しました' };
  } catch {
    return { ok: false, message: '予期せぬエラーが発生しました' };
  }
}

export type { State };

