export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as fsp from "fs/promises";
import * as fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

// 1ファイルの行数（空行除く）を数えてヘッダ1行を引く
async function countCsvRows(absPath: string): Promise<number> {
  try {
    const txt = await fsp.readFile(absPath, "utf8");
    const lines = txt.split(/\r?\n/).filter(l => l.trim() !== "");
    return Math.max(lines.length - 1, 0);
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const metaPath = path.resolve(process.cwd(), "public", "datasets", "meta.json");
    const raw = await fsp.readFile(metaPath, "utf8");
    const json = JSON.parse(raw); // { datasets: [...] } を想定

    // CSVの実数で count を上書き
    const baseDir = path.resolve(process.cwd(), "public");
    if (Array.isArray(json.datasets)) {
      await Promise.all(
        json.datasets.map(async (ds: any) => {
          if (typeof ds?.file === "string") {
            const abs = path.resolve(baseDir, ds.file.replace(/^\//, ""));
            ds.count = await countCsvRows(abs);
          }
        })
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    console.error("[/api/datasets] error:", e?.message || e);
    return NextResponse.json({ datasets: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as unknown as File | null;
    const name = (form.get("name") as string | null) || null;
    const tagsRaw = (form.get("tags") as string | null) || "";
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // 保存先パス
    const publicDir = path.resolve(process.cwd(), "public");
    const datasetsDir = path.join(publicDir, "datasets");
    await fsp.mkdir(datasetsDir, { recursive: true });

    // id とファイル名を生成
    const ts = Date.now();
    const safeBase = (name || file.name || `dataset_${ts}`).replace(/[^a-zA-Z0-9-_一-龥ぁ-んァ-ン]/g, "_");
    const id = `${safeBase}_${ts}`;
    const relFile = `/datasets/${id}.csv`;
    const absFile = path.join(publicDir, relFile.replace(/^\//, ""));

    // ファイル保存
    const arrayBuffer = await file.arrayBuffer();
    await fsp.writeFile(absFile, Buffer.from(arrayBuffer));

    // 行数カウント
    const count = await countCsvRows(absFile);

    // meta.json 更新
    const metaPath = path.resolve(publicDir, "datasets", "meta.json");
    let meta: any = { datasets: [] };
    try {
      const raw = await fsp.readFile(metaPath, "utf8");
      meta = JSON.parse(raw);
      if (!Array.isArray(meta.datasets)) meta.datasets = [];
    } catch {
      // 初回は新規作成
    }

    const tags = tagsRaw
      .split(/[,\s]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const entry = {
      id,
      name: name || file.name || id,
      tags,
      count,
      file: relFile,
    };

    meta.datasets.push(entry);
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");

    return NextResponse.json({ dataset: entry }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/datasets POST] error:", e?.message || e);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}

// データセット削除機能を追加
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const metaPath = path.resolve(process.cwd(), "public", "datasets", "meta.json");
    let meta: any = { datasets: [] };
    
    try {
      const raw = await fsp.readFile(metaPath, "utf8");
      meta = JSON.parse(raw);
      if (!Array.isArray(meta.datasets)) meta.datasets = [];
    } catch {
      return NextResponse.json({ error: "meta.json not found" }, { status: 404 });
    }

    // データセットを検索
    const datasetIndex = meta.datasets.findIndex((ds: any) => ds.id === id);
    if (datasetIndex === -1) {
      return NextResponse.json({ error: "dataset not found" }, { status: 404 });
    }

    const dataset = meta.datasets[datasetIndex];

    // ファイルを削除
    const publicDir = path.resolve(process.cwd(), "public");
    const absFile = path.join(publicDir, dataset.file.replace(/^\//, ""));
    try {
      await fsp.unlink(absFile);
    } catch (e) {
      console.warn("File deletion failed:", e);
    }

    // meta.jsonから削除
    meta.datasets.splice(datasetIndex, 1);
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/datasets DELETE] error:", e?.message || e);
    return NextResponse.json({ error: "deletion failed" }, { status: 500 });
  }
}
