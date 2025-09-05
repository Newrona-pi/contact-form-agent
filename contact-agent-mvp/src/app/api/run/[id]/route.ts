export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getRunDetail } from "@/lib/engine";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const detail = getRunDetail(params.id);
  if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ run: detail }, { status: 200 });
}
