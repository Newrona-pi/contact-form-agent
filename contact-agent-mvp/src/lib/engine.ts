// src/lib/engine.ts
import { spawn } from "child_process";
import readline from "readline";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import os from "os";
import yaml from "js-yaml";
import type {
  Run,
  RunDetail,
  RunCreateRequest,
  DatasetMeta,
} from "./types";

/**
 * ジョブ管理（MVPではメモリ管理で十分）
 */
type Job = {
  id: string;
  dir: string;
  mergedCsv: string;
  dataYaml: string;
  child?: ReturnType<typeof spawn>;
  run: RunDetail;
  stdoutBuf: string[];
  stderrBuf: string[];
  resultCsv?: string;
};

type JobMap = Map<string, Job>;
const g = globalThis as any;
const jobs: JobMap = g.__FORMFILLER_JOBS__ || new Map<string, Job>();
if (!g.__FORMFILLER_JOBS__) g.__FORMFILLER_JOBS__ = jobs;

const ENV = {
  PY: process.env.ENGINE_PYTHON || "python",
  ENTRY: process.env.ENGINE_ENTRY || "yourtool.cli",
  WORKDIR: process.env.ENGINE_WORKDIR || process.cwd(),
  // 実行モードでは --dry-run / --no-submit / --limit N を除去して安全運用
  DEFAULT_ARGS: (() => {
    const raw = (process.env.ENGINE_DEFAULT_ARGS || "");
    const sanitized = raw
      .replace(/\s--dry-run\b/g, "")
      .replace(/\s--no-submit\b/g, "")
      .replace(/\s--limit\s+\d+\b/g, "");
    return sanitized.trim().split(/\s+/).filter(Boolean);
  })(),
};

/**
 * 公開API：実行開始（結合CSV作成 → data.yaml作成 → Python起動）
 */
export async function startRun(
  req: RunCreateRequest,
  datasetsMeta: DatasetMeta[],
): Promise<Run> {
  const id = randomUUID();
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), `formfill-${id}-`));

  // 1) CSV結合
  const mergedCsv = path.join(dir, "urls.csv");
  await mergeCsvs(mergedCsv, req.datasetIds, datasetsMeta);

  // 2) YAML生成（ツールのFILLABLE_KEYSに合うよう最低限のキーを用意）
  const dataYaml = path.join(dir, "data.yaml");
  await writeYaml(dataYaml, req);

  // 3) Run初期化
  const total = Math.max((await countLines(mergedCsv)) - 1, 0); // 先頭をヘッダと想定
  const runDetail: RunDetail = {
    id,
    status: "queued",
    total,
    success: 0,
    failed: 0,
    inProgress: total,
    startedAt: new Date().toISOString(),
    tasks: [],
  };

  const job: Job = {
    id,
    dir,
    mergedCsv,
    dataYaml,
    run: runDetail,
    stdoutBuf: [],
    stderrBuf: [],
  };
  jobs.set(id, job);

  // 4) Python起動（非同期）
  launchPython(job, req).catch((err) => {
    job.run.status = "failed";
    job.run.inProgress = 0;
    job.run.lastError = String(err);
    job.run.finishedAt = new Date().toISOString();
  });

  return stripTasks(job.run);
}

/** 公開API：進捗取得用 */
export function getRunDetail(id: string): RunDetail | undefined {
  return jobs.get(id)?.run;
}

/** 公開API：結果CSVのパス（ダウンロード用に使う） */
export function getRunResultCsvPath(id: string): string | undefined {
  return jobs.get(id)?.resultCsv;
}

/* ========== 内部ユーティリティ ========== */

async function mergeCsvs(
  outFile: string,
  selectedIds: string[],
  metas: DatasetMeta[],
) {
  const chosen = metas.filter((m) => selectedIds.includes(m.id));
  if (chosen.length === 0) throw new Error("no datasets selected");

  let wroteHeader = false;
  const out = fs.createWriteStream(outFile, { encoding: "utf8" });

  for (const m of chosen) {
    const abs = path.resolve(
      process.cwd(),
      "public",
      m.file.replace(/^\/+/, ""),
    );
    const content = await fsp.readFile(abs, "utf8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) continue;

    const [header, ...rows] = lines;
    if (!wroteHeader) {
      out.write(header + "\n");
      wroteHeader = true;
    }
    if (rows.length) out.write(rows.join("\n") + "\n");
  }
  await new Promise<void>((res) => out.end(() => res()));
}

async function writeYaml(file: string, req: RunCreateRequest) {
  // 必要に応じてキー拡張可（department等）
  const payload = {
    defaults: {
      message: req.template.body,
      email: req.profile.email,
      phone: req.profile.phone || "",
      first_name: req.profile.firstName,
      last_name: req.profile.lastName,
      name: `${req.profile.lastName} ${req.profile.firstName}`,
      department: req.profile.department || "",
      website: req.profile.website || "",
      address: req.profile.address || "",
      postal_code: req.profile.postalCode || "",
    },
  };
  
  // 詳細ログ: 入力データの確認
  console.log("=== フォーム入力データ確認 ===");
  console.log("プロファイル情報:");
  console.log(`  名前: ${req.profile.lastName} ${req.profile.firstName}`);
  console.log(`  メール: ${req.profile.email}`);
  console.log(`  電話: ${req.profile.phone || "未入力"}`);
  console.log(`  部署: ${req.profile.department || "未入力"}`);
  console.log(`  ウェブサイト: ${req.profile.website || "未入力"}`);
  console.log(`  住所: ${req.profile.address || "未入力"}`);
  console.log(`  郵便番号: ${req.profile.postalCode || "未入力"}`);
  console.log("メッセージテンプレート:");
  console.log(`  ${req.template.body}`);
  console.log("生成されるYAMLデータ:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("================================");
  
  await fsp.writeFile(file, yaml.dump(payload), "utf8");
}

async function countLines(file: string) {
  const buf = await fsp.readFile(file, "utf8");
  return buf.split(/\r?\n/).filter(Boolean).length;
}

function stripTasks(run: RunDetail): Run {
  const { tasks, ...rest } = run;
  return rest;
}

// JSON Lines の status を正規化して成功/失敗を判定する
function normalizeResultStatus(s: any): "ok" | "ng" {
  const t = String(s ?? "ok").toLowerCase();
  const OK = new Set(["ok", "success", "done", "dry_run", "dryrun", "dry-run"]);
  const NG = new Set(["ng", "fail", "failed", "error", "timeout"]);
  if (OK.has(t)) return "ok";
  if (NG.has(t)) return "ng";
  return "ok"; // 想定外は成功扱いに倒す（ハング防止）
}

function buildArgs(job: Job, req: RunCreateRequest): string[] {
  // 例：run --csv urls.csv --data data.yaml --concurrency 3 --timeout 12 --dry-run --no-submit
  const args: string[] = ["-m", ENV.ENTRY];
  args.push("--csv", job.mergedCsv);
  args.push("--data", job.dataYaml);
  args.push("--concurrency", String(req.config.concurrency));
  args.push("--timeout", String(req.config.timeoutSec));
  if (req.config.dryRun) args.push("--dry-run", "--no-submit");
  if (req.config.showBrowser) args.push("--show-browser");
  if (req.config.captcha && req.config.captcha !== "none") {
    args.push("--captcha-api", req.config.captcha);
  }
  if (ENV.DEFAULT_ARGS.length) args.push(...ENV.DEFAULT_ARGS);
  // 重要：出力先を固定（Next 側が常に拾えるようにする）
  args.push("--output", `${(job as any).dir ?? ""}/result.csv`);
  // 実行中の結果を行単位で受け取るために JSON Lines を有効化
  args.push("--emit-json");
  return args;
}

async function launchPython(job: Job, req: RunCreateRequest) {
  job.run.status = "running";

  const args = buildArgs(job, req);
  const [pyCmd, ...pyArgs] = ENV.PY.split(/\s+/); // "py -3" 対応

  // 詳細ログ: Pythonプロセスの起動情報
  console.log("=== Pythonプロセス起動 ===");
  console.log(`コマンド: ${pyCmd}`);
  console.log(`引数: ${pyArgs.join(" ")}`);
  console.log(`実行引数: ${args.join(" ")}`);
  console.log(`作業ディレクトリ: ${ENV.WORKDIR}`);
  console.log("==========================");

  const child = spawn(pyCmd, [...pyArgs, ...args], {
    cwd: ENV.WORKDIR,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  job.child = child;

  // JSON Lines（--emit-json）の受信で進捗を更新
  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", (line) => {
    try {
      const ev = JSON.parse(line);
      if (ev?.event === "result") {
        // 詳細ログ: フォーム入力結果の確認
        console.log("=== フォーム入力結果 ===");
        console.log(`URL: ${ev.url || "不明"}`);
        console.log(`ステータス: ${ev.status || "不明"}`);
        console.log(`メモ: ${ev.note || "なし"}`);
        console.log(`未マップフィールド: ${ev.unmapped || "なし"}`);
        console.log("========================");
        
        // 1URL完了ごとにカウント更新（dry_run 等も成功扱いに含める）
        const st = normalizeResultStatus(ev.status);
        if (st === "ok") job.run.success += 1;
        else job.run.failed += 1;
        if (job.run.inProgress > 0) job.run.inProgress -= 1;
        // 直近の行をタスク表に追記（必要なら拡張）
        job.run.tasks.push({
          url: ev.url || "",
          status: st === "ok" ? "success" : "failed",
          durationMs: undefined,
          error: ev.note || undefined,
        });
      } else if (ev?.event === "mapping") {
        // マッピング情報のログ（Preflight用だが、Run中でも確認可能）
        console.log("=== フィールドマッピング ===");
        console.log(`URL: ${ev.url || "不明"}`);
        if (ev.mapping && Array.isArray(ev.mapping)) {
          ev.mapping.forEach((map: any) => {
            console.log(`  ${map.key}: ${map.selector} (信頼度: ${map.confidence || "不明"})`);
          });
        }
        console.log("=========================");
      }
      // event: "mapping" は Preflight 用。Run中は無視でOK
    } catch { /* JSONでない行は無視 */ }
  });
  child.stderr.on("data", (buf) => {
    const stderrData = buf.toString();
    job.stderrBuf.push(stderrData);
    // エラーログの出力
    console.log("=== Pythonプロセスエラー ===");
    console.log(stderrData);
    console.log("============================");
  });

  const exitCode: number = await new Promise((res) => child.on("close", res));
  rl.close();

  // 詳細ログ: プロセス終了情報
  console.log("=== Pythonプロセス終了 ===");
  console.log(`終了コード: ${exitCode}`);
  console.log(`標準エラー出力: ${job.stderrBuf.join("")}`);
  console.log("==========================");

  // 結果CSVの想定パス（エンジンがここに "result.csv" を吐く想定）
  const resultCsv = path.join(job.dir, "result.csv");
  if (fs.existsSync(resultCsv)) {
    job.resultCsv = resultCsv;

    // 詳細ログ: 結果CSVの内容確認
    console.log("=== 結果CSVファイル確認 ===");
    const csvContent = await fsp.readFile(resultCsv, "utf8");
    console.log("CSV内容:");
    console.log(csvContent);
    console.log("============================");

    // 簡易集計（status列に success/fail が入る想定）
    const rows = csvContent.trim().split(/\r?\n/);
    const [header, ...lines] = rows;
    const statusIdx = header
      .split(",")
      .findIndex((h) => h.toLowerCase() === "status");
    let success = 0,
      failed = 0;
    for (const line of lines) {
      const cols = line.split(",");
      const s = (cols[statusIdx] || "").toLowerCase();
      if (s.includes("success")) success++;
      else if (s.includes("fail")) failed++;
    }
    job.run.success = success;
    job.run.failed = failed;
    job.run.inProgress = 0;
  } else {
    // 出力が無い場合は終了コードでざっくり判断
    console.log("=== 結果CSVファイルが見つかりません ===");
    job.run.inProgress = 0;
    if (exitCode === 0) job.run.success = job.run.total;
    else job.run.failed = job.run.total;
  }

  job.run.status = exitCode === 0 ? "done" : "failed";
  job.run.finishedAt = new Date().toISOString();
}
