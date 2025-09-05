export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getRunResultCsvPath } from "@/lib/engine";
import * as fsp from "fs/promises";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const p = getRunResultCsvPath(params.id);
  if (!p) return NextResponse.json({ error: "no result yet" }, { status: 404 });
  const buf = await fsp.readFile(p);
  // UTF-8 BOM を先頭に付与（Excel 互換のため）。既に付いている場合はそのまま
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const body = buf.slice(0, 3).equals(bom) ? buf : Buffer.concat([bom, buf]);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="result_${params.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
