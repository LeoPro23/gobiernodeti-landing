import { readFile } from "node:fs/promises"
import path from "node:path"
import type { NextRequest } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { countAttendees, getAttendees } from "@/lib/admin-registrations"
import { parseExportFilter } from "@/lib/export-rules"
import { fillParticipantTemplate, participantNamesText, PARTICIPANT_TEMPLATE_PATH } from "@/lib/participant-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Exportación de inscritos al Fullday para el sorteo, según las reglas de incluir/excluir:
//   ?formato=xlsx (por defecto): plantilla de sorteo en Excel.
//   ?formato=txt: un nombre completo por línea, para la ruleta externa.
//   ?formato=conteo: solo cuántas personas saldrían (vista previa en el panel).
//   ?reglas=[...]&solo_asistentes=0 ajustan quiénes salen (ver lib/export-rules.ts).
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado." }, { status: 403 })
  const params = req.nextUrl.searchParams
  const filter = parseExportFilter({ reglas: params.get("reglas"), solo_asistentes: params.get("solo_asistentes") })
  const requested = params.get("formato")
  const format = requested === "txt" || requested === "conteo" ? requested : "xlsx"

  try {
    if (format === "conteo") {
      return Response.json({ total: await countAttendees(filter) }, { headers: { "Cache-Control": "no-store" } })
    }
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date())
    const prefix = filter.onlyAttended ? "Asistentes" : "Inscritos"
    const headers = {
      "Content-Disposition": `attachment; filename="${prefix}_XII_FULL_DAY_2026_${date}.${format}"`,
      "Cache-Control": "private, no-store",
    }
    if (format === "txt") {
      const attendees = await getAttendees(filter)
      return new Response(participantNamesText(attendees.map(row => row.full_name)), {
        headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
      })
    }
    const [template, attendees] = await Promise.all([
      readFile(path.join(process.cwd(), PARTICIPANT_TEMPLATE_PATH)),
      getAttendees(filter),
    ])
    // La inscripción al Fullday no pide correo: esa columna queda vacía.
    const bytes = fillParticipantTemplate(template, attendees.map(row => ({ fullName: row.full_name, phone: row.telefono })))
    return new Response(new Uint8Array(bytes), {
      headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    })
  } catch (error) {
    console.error("Error al exportar asistentes", error)
    return Response.json({ error: "No se pudo generar el archivo de asistentes." }, { status: 500 })
  }
}
