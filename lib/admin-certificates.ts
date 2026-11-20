import "server-only"
import { requireAdmin } from "@/lib/admin-auth"
import { getPool } from "@/lib/db"
import { getFilterOptions, PAGE_SIZE, parseFilters, registrationWhere, type SearchParams } from "@/lib/admin-registrations"

export type CertificateRequest = {
  id: string
  registration_id: number
  nombres: string
  apellidos: string
  dni: string
  universidad: string
  carrera: string
  ciclo: string
  ciudad: string | null
  telefono: string | null
  operation_number: string | null
  status: string
  created_at: Date | null
}

export async function getAdminCertificates(params: SearchParams) {
  await requireAdmin()
  const pool = getPool()
  const filters = parseFilters(params)
  const { sql, values } = registrationWhere(filters, true)
  const from = "FROM registration_payment_images p JOIN registrations r ON r.id = p.registration_id"
  const [summary, count, options] = await Promise.all([
    pool.query<{ total: number; pending: number; valid: number; invalid: number }>(`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'pending')::int AS pending,
        count(*) FILTER (WHERE status = 'valid')::int AS valid,
        count(*) FILTER (WHERE status = 'invalid')::int AS invalid
      FROM registration_payment_images`),
    pool.query<{ total: number }>(`SELECT count(*)::int AS total ${from} ${sql}`, values),
    getFilterOptions(),
  ])
  const total = count.rows[0].total
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const result = await pool.query<CertificateRequest>(`
    SELECT p.id, p.registration_id, r.nombres, r.apellidos, r.dni, r.universidad, r.carrera,
      r.ciclo, r.ciudad, r.telefono, p.operation_number, p.status, p.created_at
    ${from} ${sql}
    ORDER BY p.created_at DESC NULLS LAST, p.id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE])
  return { filters, requests: result.rows, summary: summary.rows[0], options, total, page, pages }
}
