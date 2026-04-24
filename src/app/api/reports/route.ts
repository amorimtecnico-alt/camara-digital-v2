import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      message: "Use a rota /api/reports/export para exportar relatórios filtrados.",
    },
    { status: 400 },
  );
}
