import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const [{ getCurrentUser }, { canAccessRoute }, { getAgendaMarkersForMonth, parseAgendaDateKey }] = await Promise.all([
    import("@/lib/auth"),
    import("@/lib/permissions"),
    import("@/modules/agenda/queries"),
  ]);

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
