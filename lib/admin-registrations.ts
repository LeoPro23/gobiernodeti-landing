import "server-only"
import { getPool } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export type SearchParams = Record<string, string | string[] | undefined>
export type Registration = {
  id: number
  nombres: string
  apellidos: string
  dni: string
  universidad: string
  carrera: string
  ciclo: string
  telefono: string | null
  ciudad: string | null
  acepta_terminos: boolean
  autoriza_datos: boolean
  created_at: Date | null
}

export const PAGE_SIZE = 25

export function parseFilters(params: SearchParams) {
  const text = (key: string, max = 200) => typeof params[key] === "string" ? params[key].trim().slice(0, max) : ""
  const rawPage = text("page", 10)
  const page = /^\d+$/.test(rawPage) ? Math.max(1, Math.min(Number(rawPage), 1_000_000)) : 1
  return { q: text("q", 150), universidad: text("universidad"), ciudad: text("ciudad", 100), page }
}

export function registrationWhere(filters: ReturnType<typeof parseFilters>) {
  const values: string[] = []
  const conditions: string[] = []
  if (filters.q) {
    // Treat LIKE wildcards as text, not user-supplied pattern operators.
    values.push(`%${filters.q.replace(/[\\%_]/g, "\\$&")}%`)
    conditions.push(`(concat_ws(' ', nombres, apellidos) ILIKE $${values.length} OR dni ILIKE $${values.length} OR carrera ILIKE $${values.length})`)
  }
  for (const column of ["universidad", "ciudad"] as const) {
    if (filters[column]) {
      values.push(filters[column])
      conditions.push(`${column} = $${values.length}`)
    }
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values }
}

export async function getAdminRegistrations(params: SearchParams) {
  // Authorization belongs at the data access boundary, not only in the UI.
  await requireAdmin()
  const pool = getPool()
  const filters = parseFilters(params)
  const { sql, values } = registrationWhere(filters)
  const [summary, count, options] = await Promise.all([
    pool.query<{ total: number; today: number; universities: number }>(`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE (created_at AT TIME ZONE 'America/Lima')::date = (now() AT TIME ZONE 'America/Lima')::date)::int AS today,
        count(DISTINCT universidad)::int AS universities
      FROM registrations`),
    pool.query<{ total: number }>(`SELECT count(*)::int AS total FROM registrations ${sql}`, values),
    pool.query<{ universities: string[] | null; cities: string[] | null }>(`
      SELECT array_agg(DISTINCT universidad ORDER BY universidad) FILTER (WHERE universidad IS NOT NULL AND universidad <> '') AS universities,
        array_agg(DISTINCT ciudad ORDER BY ciudad) FILTER (WHERE ciudad IS NOT NULL AND ciudad <> '') AS cities
      FROM registrations`),
  ])
  const total = count.rows[0].total
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const rows = await pool.query<Registration>(`
    SELECT id, nombres, apellidos, dni, universidad, carrera, ciclo, telefono, ciudad,
      acepta_terminos, autoriza_datos, created_at
    FROM registrations ${sql}
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  )
  return {
    filters, registrations: rows.rows, summary: summary.rows[0],
    options: { universities: options.rows[0].universities ?? [], cities: options.rows[0].cities ?? [] },
    total, page, pages,
  }
}
