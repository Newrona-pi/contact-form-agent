import type { DatasetMeta, PreflightRequest, PreflightResult, Run, RunDetail, RunCreateRequest } from './types';

const API_BASE = '/api';

export const api = {
  // データセット一覧取得
  getDatasets: async (): Promise<{ datasets: DatasetMeta[] }> => {
    const response = await fetch(`${API_BASE}/datasets`);
    if (!response.ok) {
      throw new Error('データセットの取得に失敗しました');
    }
    return response.json();
  },

  // データセット追加（CSVアップロード）
  uploadDataset: async (params: { file: File; name?: string; tags?: string[] }): Promise<{ dataset: DatasetMeta }> => {
    const form = new FormData();
    form.append('file', params.file);
    if (params.name) form.append('name', params.name);
    if (params.tags && params.tags.length) form.append('tags', params.tags.join(','));

    const response = await fetch(`${API_BASE}/datasets`, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      throw new Error('データセットのアップロードに失敗しました');
    }
    return response.json();
  },

  // 事前テスト実行
  preflight: async (request: PreflightRequest): Promise<{ results: PreflightResult[] }> => {
    const response = await fetch(`${API_BASE}/preflight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error('事前テストの実行に失敗しました');
    }
    return response.json();
  },
};

export async function createRun(payload: RunCreateRequest): Promise<Run> {
  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.run as Run;
}

export async function fetchRun(id: string): Promise<RunDetail | null> {
  const res = await fetch(`/api/run/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;           // ← ここがポイント
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.run as RunDetail;
}

export function exportRunUrl(id: string): string {
  return `/api/run/${id}/export`;
}

export async function runPreflight(payload: PreflightRequest): Promise<PreflightResult[]> {
  const res = await fetch("/api/preflight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.results as PreflightResult[];
}
