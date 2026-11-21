import "server-only"
import { ensureRegistrationTable, getPool } from "@/lib/db"
import { exportWhere, type ExportFilter } from "@/lib/export-rules"
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
  asistio: boolean
  origen: string
  /** Tiene comprobantes de pago de certificado: no se puede quitar la inscripción. */
  has_payment: boolean
}

export const PAGE_SIZE = 25

export function parseFilters(params: SearchParams) {
  const text = (key: string, max = 200) => typeof params[key] === "string" ? params[key].trim().slice(0, max) : ""
  const rawPage = text("page", 10)
  const page = /^\d+$/.test(rawPage) ? Math.max(1, Math.min(Number(rawPage), 1_000_000)) : 1
  const date = (key: string) => {
    const value = text(key, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return ""
    const parsed = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : ""
  }
  let desde = date("desde"), hasta = date("hasta")
  if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde]
  const boolean = (key: string) => ["true", "false"].includes(text(key)) ? text(key) : ""
  const status = text("status")
  return {
    q: text("q", 150), universidad: text("universidad"), ciudad: text("ciudad", 100),
    carrera: text("carrera"), ciclo: text("ciclo", 50), desde, hasta,
    acepta_terminos: boolean("acepta_terminos"), autoriza_datos: boolean("autoriza_datos"),
    status: ["pending", "valid", "invalid"].includes(status) ? status : "", page,
  }
}

export type AdminFilters = ReturnType<typeof parseFilters>
export type FilterOptions = { universities: string[]; cities: string[]; careers: string[]; cycles: string[] }

export function activeFilterEntries(filters: AdminFilters, certificates = false) {
  return Object.entries(filters).filter(([key, value]) => key !== "page" && value !== ""
    && (certificates ? !["acepta_terminos", "autoriza_datos"].includes(key) : key !== "status"))
}

export function adminPageUrl(path: string, filters: AdminFilters, page = 1) {
  const query = new URLSearchParams()
  for (const [key, value] of activeFilterEntries(filters, path === "/dashboard/certificados")) query.set(key, String(value))
  if (page > 1) query.set("page", String(page))
  return `${path}${query.size ? `?${query}` : ""}`
}

export function registrationWhere(filters: AdminFilters, certificates = false) {
  const values: string[] = []
  const conditions: string[] = []
  if (filters.q) {
    // Treat LIKE wildcards as text, not user-supplied pattern operators.
    values.push(`%${filters.q.replace(/[\\%_]/g, "\\$&")}%`)
    conditions.push(`(concat_ws(' ', r.nombres, r.apellidos) ILIKE $${values.length} OR r.dni ILIKE $${values.length} OR r.carrera ILIKE $${values.length} OR r.telefono ILIKE $${values.length}${certificates ? ` OR p.operation_number ILIKE $${values.length}` : ""})`)
  }
  for (const column of ["universidad", "ciudad", "carrera", "ciclo"] as const) {
    if (filters[column]) {
      values.push(filters[column])
      conditions.push(`r.${column} = $${values.length}`)
    }
  }
  const dateColumn = certificates ? "p.created_at" : "r.created_at"
  for (const [key, operator] of [["desde", ">="], ["hasta", "<="]] as const) {
    if (filters[key]) {
      values.push(filters[key])
      conditions.push(`(${dateColumn} AT TIME ZONE 'America/Lima')::date ${operator} $${values.length}::date`)
    }
  }
  if (certificates && filters.status) {
    values.push(filters.status)
    conditions.push(`p.status = $${values.length}`)
  }
  if (!certificates) {
    for (const column of ["acepta_terminos", "autoriza_datos"] as const) {
      if (filters[column]) {
        values.push(filters[column])
        conditions.push(`r.${column} = $${values.length}::boolean`)
      }
    }
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values }
}

export async function getFilterOptions(): Promise<FilterOptions> {
  // Keep this helper protected even when called independently of a page loader.
  await requireAdmin()
  const result = await getPool().query<{
    universities: string[] | null; cities: string[] | null; careers: string[] | null; cycles: string[] | null
  }>(`SELECT
    array_agg(DISTINCT universidad ORDER BY universidad) FILTER (WHERE universidad IS NOT NULL AND universidad <> '') AS universities,
    array_agg(DISTINCT ciudad ORDER BY ciudad) FILTER (WHERE ciudad IS NOT NULL AND ciudad <> '') AS cities,
    array_agg(DISTINCT carrera ORDER BY carrera) FILTER (WHERE carrera IS NOT NULL AND carrera <> '') AS careers,
    array_agg(DISTINCT ciclo ORDER BY ciclo) FILTER (WHERE ciclo IS NOT NULL AND ciclo <> '') AS cycles
    FROM registrations`)
  const row = result.rows[0]
  return { universities: row.universities ?? [], cities: row.cities ?? [], careers: row.careers ?? [],
    cycles: (row.cycles ?? []).sort((a, b) => a.localeCompare(b, "es", { numeric: true })) }
}

/** Inscritos que pasan el filtro de exportación (por defecto, solo asistentes), en orden alfabético. */
export async function getAttendees(filter: ExportFilter = { onlyAttended: true, rules: [] }) {
  await requireAdmin()
  await ensureRegistrationTable()
  const { sql, values } = exportWhere(filter)
  const result = await getPool().query<{ full_name: string; telefono: string | null }>(`
    SELECT concat_ws(' ', trim(nombres), NULLIF(trim(apellidos), '')) AS full_name, telefono
    FROM registrations
    ${sql}
    ORDER BY lower(concat_ws(' ', trim(nombres), NULLIF(trim(apellidos), ''))), id`, values)
  return result.rows
}

/** Cuántas personas saldrían en la exportación con ese filtro. */
export async function countAttendees(filter: ExportFilter) {
  await requireAdmin()
  await ensureRegistrationTable()
  const { sql, values } = exportWhere(filter)
  const result = await getPool().query<{ total: number }>(`SELECT count(*)::int AS total FROM registrations ${sql}`, values)
  return result.rows[0].total
}

export async function getAdminRegistrations(params: SearchParams) {
  // Authorization belongs at the data access boundary, not only in the UI.
  await requireAdmin()
  await ensureRegistrationTable()
  const pool = getPool()
  const filters = parseFilters(params)
  const { sql, values } = registrationWhere(filters)
  const [summary, count, options] = await Promise.all([
    pool.query<{ total: number; today: number; universities: number; attended: number }>(`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE (created_at AT TIME ZONE 'America/Lima')::date = (now() AT TIME ZONE 'America/Lima')::date)::int AS today,
        count(DISTINCT NULLIF(universidad, ''))::int AS universities,
        count(*) FILTER (WHERE asistio)::int AS attended
      FROM registrations`),
    pool.query<{ total: number }>(`SELECT count(*)::int AS total FROM registrations r ${sql}`, values),
    getFilterOptions(),
  ])
  const total = count.rows[0].total
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const rows = await pool.query<Registration>(`
    SELECT id, nombres, apellidos, dni, universidad, carrera, ciclo, telefono, ciudad,
      acepta_terminos, autoriza_datos, created_at, asistio, origen,
      EXISTS (SELECT 1 FROM registration_payment_images p WHERE p.registration_id = r.id) AS has_payment
    FROM registrations r ${sql}
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  )
  return {
    filters, registrations: rows.rows, summary: summary.rows[0],
    options,
    total, page, pages,
  }
}
