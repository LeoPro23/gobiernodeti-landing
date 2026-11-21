import { isAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import { ensureYambolyTables, getYambolyRanking, SESSION_ID } from "@/lib/yamboly-db";
import { createDrawWorkbook } from "@/lib/yamboly-export";
import { tiebreakOutcome } from "@/lib/yamboly-rules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado." }, { status: 403 });

  try {
    await ensureYambolyTables();
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // El bloqueo garantiza que reinicios y acciones del moderador no alteren el resultado durante la descarga.
      const sessionResult = await client.query("SELECT * FROM yamboly_sessions WHERE id = $1 FOR UPDATE", [SESSION_ID]);
      const session = sessionResult.rows[0];
      if (!session || session.status !== "ROUND_RANKING" || session.current_round < session.total_rounds) {
        await client.query("ROLLBACK");
        return Response.json({ error: "El sorteo todavía no está disponible." }, { status: 409 });
      }
      const ranking = await getYambolyRanking(SESSION_ID, client);
      const { drawGroup } = tiebreakOutcome(ranking.tieGroups, ranking.prizePlaces, session.tiebreak_round, session.max_tiebreak_questions);
      if (!drawGroup) {
        await client.query("ROLLBACK");
        return Response.json({ error: "No hay un empate por el primer puesto pendiente de sorteo." }, { status: 409 });
      }
      const result = await client.query(
        "SELECT id, full_name, email, phone FROM yamboly_participants WHERE session_id = $1 AND id = ANY($2::int[])",
        [SESSION_ID, drawGroup.memberIds]
      );
      const byId = new Map(result.rows.map((participant) => [participant.id, participant]));
      const bytes = createDrawWorkbook(drawGroup.memberIds.map((id) => byId.get(id)));
      await client.query("COMMIT");
      return new Response(new Uint8Array(bytes), { headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="yamboly-empatados-sorteo.xlsx"',
        "Cache-Control": "private, no-store",
      } });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error al exportar participantes empatados", error);
    return Response.json({ error: "No se pudo generar el archivo de sorteo." }, { status: 500 });
  }
}
