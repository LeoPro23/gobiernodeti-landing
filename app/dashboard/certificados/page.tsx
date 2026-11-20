import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight, FileCheck2, Search } from "lucide-react"
import { listAdminCertificatePayments } from "@/lib/admin-certificates"
import { PAGE_SIZE, type SearchParams } from "@/lib/admin-registrations"
import { PaymentStatus } from "./payment-status"

export const metadata: Metadata = { title: "Certificados | Administración XII FULLDAY" }

const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { payments, status, q, page, pages, total } = await listAdminCertificatePayments(await searchParams)
  const filtered = Boolean(q || status)

  function pageUrl(next: number) {
    const params = new URLSearchParams({ page: String(next) })
    if (q) params.set("q", q)
    if (status) params.set("status", status)
    return `/dashboard/certificados?${params}`
  }

  return (
    <main className="admin-container">
      <section className="admin-heading">
        <div>
          <p className="admin-eyebrow">GESTIÓN DEL EVENTO / CERTIFICADOS</p>
          <h1>Solicitudes de certificado</h1>
          <p className="admin-muted">Consulta los comprobantes enviados y revisa el estado de cada pago.</p>
        </div>
        <Link href="/dashboard" className="admin-secondary"><ArrowLeft size={16} aria-hidden="true" /> Volver a inscritos</Link>
      </section>

      <section className="admin-panel" aria-labelledby="payments-title">
        <div className="admin-panel-heading">
          <h2 id="payments-title">Comprobantes <span className="admin-count">{total}</span></h2>
          <FileCheck2 size={21} aria-hidden="true" />
        </div>
        <form action="/dashboard/certificados" method="get" className="admin-filters admin-payment-filters" key={`${q}|${status}`}>
          <label className="admin-search">Buscar solicitud
            <div><Search size={17} aria-hidden="true" /><input name="q" defaultValue={q} maxLength={150} placeholder="Nombre, DNI o número de operación" /></div>
          </label>
          <label>Estado
            <select name="status" defaultValue={status}>
              <option value="">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="valid">Pagos validados</option>
              <option value="invalid">Rechazados</option>
            </select>
          </label>
          <button type="submit" className="admin-primary">Filtrar</button>
          {filtered && <Link href="/dashboard/certificados" className="admin-clear">Limpiar</Link>}
        </form>

        {payments.length > 0 ? (
          <div className="admin-table-scroll" role="region" aria-label="Lista de comprobantes" tabIndex={0}>
            <table className="admin-table admin-payment-table">
              <thead>
                <tr>{["Participante", "DNI", "N.° de operación", "Estado", "Enviado (Perú)", "Voucher"].map(label => <th key={label} scope="col">{label}</th>)}</tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id}>
                    <td className="admin-person">{payment.nombres} {payment.apellidos}</td>
                    <td className="admin-mono">{payment.dni}</td>
                    <td className="admin-mono admin-payment-operation">{payment.operation_number || "—"}</td>
                    <td><PaymentStatus status={payment.status} /></td>
                    <td className="admin-nowrap">{payment.created_at ? date.format(new Date(payment.created_at)) : "—"}</td>
                    <td><Link href={`/dashboard/certificados/${payment.id}`} className="admin-secondary admin-nowrap" prefetch={false} aria-label={`Ver voucher de ${payment.nombres} ${payment.apellidos}`}>Ver voucher</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <FileCheck2 size={30} aria-hidden="true" />
            <h3>{filtered ? "No hay comprobantes con esos filtros" : "Todavía no hay comprobantes"}</h3>
          </div>
        )}

        <footer className="admin-pagination">
          <p>{total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total} comprobantes` : "0 comprobantes"}</p>
          {pages > 1 && (
            <nav aria-label="Páginas de comprobantes">
              {page > 1 ? <Link className="admin-page" href={pageUrl(page - 1)}><ArrowLeft size={16} aria-hidden="true" /> Anterior</Link> : <span className="admin-page" aria-disabled="true">Anterior</span>}
              <span className="admin-page-label">{page} / {pages}</span>
              {page < pages ? <Link className="admin-page" href={pageUrl(page + 1)}>Siguiente <ArrowRight size={16} aria-hidden="true" /></Link> : <span className="admin-page" aria-disabled="true">Siguiente</span>}
            </nav>
          )}
        </footer>
      </section>
    </main>
  )
}
