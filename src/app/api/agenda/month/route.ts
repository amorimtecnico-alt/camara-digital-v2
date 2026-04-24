export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { getAgendaMarkersForMonth, parseAgendaDateKey } from "@/modules/agenda/queries";


export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!canAccessRoute(user, "/agenda")) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = parseAgendaDateKey(searchParams.get("date"));
  const markersByDate = await getAgendaMarkersForMonth(user, date);

  return NextResponse.json({
    markersByDate,
  });
}

