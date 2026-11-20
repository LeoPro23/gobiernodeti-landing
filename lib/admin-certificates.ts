import "server-only"

import { requireAdmin } from "@/lib/admin-auth"
import { ensureRegistrationTable, getPool, type CertificatePaymentStatus } from "@/lib/db"
import { parseFilters, PAGE_SIZE, type SearchParams } from "@/lib/admin-registrations"

type Payment = {
  id: string
  nombres: string
  apellidos: string
  dni: string
  operation_number: string | null
  status: CertificatePaymentStatus
  created_at: Date | null
}

export function isPaymentId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) &&
    (value.length < 19 || value <= "9223372036854775807")
}

const paymentFields = `payment.id, person.nombres, person.apellidos, person.dni,
  payment.operation_number, payment.status, payment.created_at`
const paymentsFrom = `FROM registration_payment_images AS payment
  JOIN registrations AS person ON person.id = payment.registration_id`

export async function listAdminCertificatePayments(params: SearchParams) {
  await requireAdmin()
  await ensureRegistrationTable()

  const { q, page: requestedPage } = parseFilters(params)
  const status = params.status === "pending" || params.status === "valid" || params.status === "invalid"
    ? params.status
    : ""
  const conditions: string[] = []
  const values: string[] = []

  if (status) {
    values.push(status)
    conditions.push(`payment.status = $${values.length}`)
  }
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`
    values.push(pattern)
    const search = `$${values.length}`
    conditions.push(`(concat_ws(' ', person.nombres, person.apellidos) ILIKE ${search}
      OR person.dni ILIKE ${search} OR payment.operation_number ILIKE ${search})`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  const pool = getPool()
  const count = await pool.query<{ total: number }>(`SELECT count(*)::int AS total ${paymentsFrom} ${where}`, values)
  const total = count.rows[0].total
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(requestedPage, pages)
  const { rows } = await pool.query<Payment>(`
    SELECT ${paymentFields}
    ${paymentsFrom} ${where}
    ORDER BY payment.created_at DESC NULLS LAST, payment.id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `, [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE])

  return { payments: rows, status, q, page, pages, total }
}

export async function getAdminCertificatePayment(id: string) {
  await requireAdmin()
  if (!isPaymentId(id)) return null
  await ensureRegistrationTable()

  const { rows } = await getPool().query<Payment>(`
    SELECT ${paymentFields}
    ${paymentsFrom}
    WHERE payment.id = $1
  `, [id])
  return rows[0] ?? null
}
