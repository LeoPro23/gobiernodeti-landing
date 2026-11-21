import { readFile } from "node:fs/promises"
import path from "node:path"
import type { NextRequest } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { getAttendees } from "@/lib/admin-registrations"
import { fillParticipantTemplate, participantNamesText, PARTICIPANT_TEMPLATE_PATH } from "@/lib/participant-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Inscritos al Fullday con asistencia marcada:
//   ?formato=xlsx (por defecto): plantilla de sorteo en Excel.
//   ?formato=txt: un nombre completo por línea, para pegar o importar en una ruleta externa.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado." }, { status: 403 })
  const format = req.nextUrl.searchParams.get("formato") === "txt" ? "txt" : "xlsx"
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date())
  const filename = `Asistentes_XII_FULL_DAY_2026_${date}.${format}`
  const headers = { "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" }

  try {
    if (format === "txt") {
      const attendees = await getAttendees()
      return new Response(participantNamesText(attendees.map(row => row.full_name)), {
        headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
      })
    }
    const [template, attendees] = await Promise.all([
      readFile(path.join(process.cwd(), PARTICIPANT_TEMPLATE_PATH)),
      getAttendees(),
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
