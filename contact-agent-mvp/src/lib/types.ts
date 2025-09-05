export type DatasetMeta = {
  id: string;
  name: string;
  tags: string[];
  count: number;
  file: string; // /public/datasets/*.csv の相対パス（モック時はこの文字列でOK）
};

export type PreflightRequest = {
  datasetIds: string[];
  template: {
    body: string;        // 問い合わせ本文（差し込み可）
  };
  profile: {
    lastName: string;
    firstName: string;
    email: string;
    phone?: string;
    department?: string;
    website?: string;
    address?: string;
    postalCode?: string;
  };
  config: {
    dryRun: boolean;
    concurrency: number; // 1..8
    timeoutSec: number;  // 5..60
    showBrowser: boolean;
    captcha: "none" | "twocaptcha" | "anticaptcha" | "capsolver";
  };
  sampleCount?: number; // default 1
};

export type MappingHit = {
  key: string;          // "first_name" | "last_name" | "email" | "phone" | "message" etc.
  selector: string;     // CSS selector (モック値でOK)
  method: "strong" | "candidate" | "score" | "autocomplete";
  confidence: number;   // 0..1
  reason?: string;      // 補足
};

export type PreflightResult = {
  url: string;
  screenshot?: string;         // 画像URL（モックはプレースホルダでOK）
  mapping: MappingHit[];
  warnings?: string[];
};

export type RunCreateRequest = PreflightRequest & {};
export type Run = {
  id: string;
  status: "queued" | "running" | "paused" | "done" | "failed";
  startedAt?: string;
  finishedAt?: string;
  total: number;
  success: number;
  failed: number;
  inProgress: number;
  lastError?: string;
};

export type RunTaskRow = {
  url: string;
  status: "queued" | "running" | "success" | "failed" | "skipped";
  durationMs?: number;
  error?: string;
};

export type RunDetail = Run & {
  tasks: RunTaskRow[];
};
