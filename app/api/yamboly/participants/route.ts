import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { listQuizParticipants, renameParticipant } from "@/lib/yamboly-admin";
import { YambolyUserError } from "@/lib/yamboly-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ error: "No autorizado. Inicia sesión como administrador en /login." }, { status: 403 });

// Inscritos al quiz para la consola del moderador.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  try {
    const participants = await listQuizParticipants(req.nextUrl.searchParams.get("q") ?? "");
    return NextResponse.json({ participants }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error in GET /api/yamboly/participants:", error);
    return NextResponse.json({ error: "No se pudo cargar la lista de inscritos." }, { status: 500 });
  }
}

// Corrige el nombre de un inscrito; el cambio queda en el historial del quiz.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  try {
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Inscrito no válido." }, { status: 400 });
    const changed = await renameParticipant(id, body?.name, process.env.ADMIN_EMAIL || "moderador");
    return NextResponse.json({ success: true, changed });
  } catch (error) {
    if (error instanceof YambolyUserError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error in POST /api/yamboly/participants:", error);
    return NextResponse.json({ error: "No se pudo guardar el nombre." }, { status: 500 });
  }
}
