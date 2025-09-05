export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import * as fsp from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import os from "os";
import yaml from "js-yaml";
import { spawn } from "child_process";
import readline from "readline";
import type { PreflightRequest, PreflightResult, DatasetMeta } from "@/lib/types";

const ENV = {
  PY: process.env.ENGINE_PYTHON || "python",
  ENTRY: process.env.ENGINE_ENTRY || "form_filler.cli",
  WORKDIR: process.env.ENGINE_WORKDIR || process.cwd(),
  DEFAULT_ARGS: (process.env.ENGINE_DEFAULT_ARGS || "").trim().split(/\s+/).filter(Boolean),
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PreflightRequest;

  // データセットメタ取得
  const metaPath = path.resolve(process.cwd(), "public", "datasets", "meta.json");
  const raw = await fsp.readFile(metaPath, "utf8").catch(() => null);
  if (!raw) return NextResponse.json({ error: "dataset meta not found" }, { status: 400 });
  const metas: DatasetMeta[] = JSON.parse(raw).datasets || [];

  // 一時ディレクトリ用意
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), `preflight-`));
  const mergedCsv = path.join(dir, "urls.csv");
  const dataYaml = path.join(dir, "data.yaml");
  const resultCsv = path.join(dir, "result.csv");

  // 1) CSV結合（ヘッダ重複を避ける）
  await mergeCsvs(mergedCsv, body.datasetIds, metas);

  // 2) YAML生成（最低限のdefaults）
  await fsp.writeFile(dataYaml, yaml.dump({
    defaults: {
      message: body.template.body,
      email: body.profile.email,
      phone: body.profile.phone || "",
      first_name: body.profile.firstName,
      last_name: body.profile.lastName,
      name: `${body.profile.lastName} ${body.profile.firstName}`,
      department: body.profile.department || "",
      website: body.profile.website || "",
      address: body.profile.address || "",
      postal_code: body.profile.postalCode || "",
    }
  }), "utf8");

  // 3) Python 起動（1件だけ・送信なし・JSON行ログ）
  const args = ["-m", ENV.ENTRY,
    "--csv", mergedCsv, "--data", dataYaml,
    "--limit", String(body.sampleCount ?? 1),
    "--dry-run", "--no-submit", "--emit-json",
    "--output", resultCsv,
  ];
  if (body.config?.showBrowser) args.push("--show-browser");
  if (body.config?.captcha && body.config.captcha !== "none") args.push("--captcha-api", body.config.captcha);
  if (typeof body.config?.concurrency === "number") args.push("--concurrency", String(body.config.concurrency));
  if (typeof body.config?.timeoutSec === "number") args.push("--timeout", String(body.config.timeoutSec));
  if (ENV.DEFAULT_ARGS.length) args.push(...ENV.DEFAULT_ARGS);

  const [py, ...pyArgs] = (process.env.ENGINE_PYTHON || "python").split(/\s+/);
  const child = spawn(py, [...pyArgs, ...args], { cwd: ENV.WORKDIR, env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });

  const results: PreflightResult[] = [];
  let lastMapping: any = null;
  const rl = readline.createInterface({ input: child.stdout });

  rl.on("line", (line) => {
    try {
      const ev = JSON.parse(line);
      if (ev?.event === "mapping") {
        lastMapping = ev.mapping || [];
      }
    } catch { /* noop */ }
  });

  const code: number = await new Promise(res => child.on("close", res));
  rl.close();

  // CSV から1件目の URL を拾う（表示用）
  const url = await firstUrlFromCsv(mergedCsv);

  if (lastMapping && Array.isArray(lastMapping)) {
    results.push({
      url,
      mapping: lastMapping.map((m: any) => ({
        key: m.key, selector: m.selector, method: "candidate", confidence: 0.8
      })),
      warnings: code === 0 ? [] : ["preflight exited with non-zero code"],
      screenshot: undefined,
    });
  }

  return NextResponse.json({ results }, { status: 200 });
}

/* ---------- helpers ---------- */

async function mergeCsvs(outFile: string, ids: string[], metas: DatasetMeta[]) {
  const chosen = metas.filter(m => ids.includes(m.id));
  if (!chosen.length) throw new Error("no datasets selected");
  const out = fs.createWriteStream(outFile, "utf8");
  let wroteHeader = false;
  for (const m of chosen) {
    const abs = path.resolve(process.cwd(), "public", m.file.replace(/^\/+/, ""));
    const txt = await fsp.readFile(abs, "utf8");
    const [header, ...lines] = txt.split(/\r?\n/);
    if (!wroteHeader) { out.write(header + "\n"); wroteHeader = true; }
    if (lines.length) out.write(lines.filter(Boolean).join("\n") + "\n");
  }
  await new Promise<void>(r => out.end(r));
}

async function firstUrlFromCsv(csvPath: string) {
  const txt = await fsp.readFile(csvPath, "utf8");
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return "";
  const headers = lines[0].split(",");
  const idx = headers.findIndex(h => h.trim() === "form_url");
  const cols = lines[1].split(",");
  return idx >= 0 ? (cols[idx] || "") : "";
}
