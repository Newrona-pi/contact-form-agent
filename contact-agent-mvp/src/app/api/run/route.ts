export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { startRun } from "@/lib/engine";
import type { DatasetMeta, RunCreateRequest } from "@/lib/types";
import * as fsp from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RunCreateRequest;

  // public/datasets/meta.json からデータセット一覧を読む
  const metaPath = path.resolve(process.cwd(), "public", "datasets", "meta.json");
  const raw = await fsp.readFile(metaPath, "utf8").catch(() => null);
  if (!raw) {
    return NextResponse.json({ error: "dataset meta not found" }, { status: 400 });
  }
  const datasets: DatasetMeta[] = JSON.parse(raw).datasets || [];
  if (!Array.isArray(datasets) || datasets.length === 0) {
    return NextResponse.json({ error: "no datasets" }, { status: 400 });
  }

  const run = await startRun(body, datasets);
  return NextResponse.json({ run }, { status: 200 });
}
