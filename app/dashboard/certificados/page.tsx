import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Clock3, ExternalLink, FileBadge, RefreshCw, Search, XCircle } from "lucide-react"
import { getAdminCertificates } from "@/lib/admin-certificates"
import { activeFilterEntries, adminPageUrl, type SearchParams } from "@/lib/admin-registrations"
import { DashboardFilters, DashboardPagination, DashboardTabs } from "../dashboard-ui"

export const runtime = "nodejs"
export const metadata: Metadata = { title: "Certificados | Administración XII FULLDAY" }
const number = new Intl.NumberFormat("es-PE")
const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })
const statuses: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "admin-badge-pending" },
  valid: { label: "Válido", className: "admin-badge-yes" },
  invalid: { label: "Inválido", className: "admin-badge-invalid" },
}

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filters, requests, summary, options, total, page, pages } = await getAdminCertificates(await searchParams)
  const active = activeFilterEntries(filters, true).length > 0
  return <main className="admin-container">
    <DashboardTabs certificates />
    <section className="admin-heading">
      <div><p className="admin-eyebrow">GESTIÓN DEL EVENTO / CERTIFICADOS</p><h1>Un paso más para certificar.</h1><p className="admin-muted">Solicitudes de certificado y comprobantes de pago de los participantes.</p></div>
      <a href={adminPageUrl("/dashboard/certificados", filters, page)} className="admin-secondary"><RefreshCw size={16} aria-hidden="true" /> Actualizar datos</a>
    </section>
    <section className="admin-stats admin-stats-four" aria-label="Resumen general de comprobantes">
      <article className="admin-stat admin-stat-featured"><div><span>Comprobantes recibidos</span><strong>{number.format(summary.total)}</strong><small>Solicitudes de certificado</small></div><FileBadge size={28} aria-hidden="true" /></article>
      <article className="admin-stat"><div><span>Pendientes</span><strong>{number.format(summary.pending)}</strong><small>En espera de revisión</small></div><Clock3 size={26} aria-hidden="true" /></article>
      <article className="admin-stat"><div><span>Pagos válidos</span><strong>{number.format(summary.valid)}</strong><small>Comprobantes validados</small></div><CheckCircle2 size={26} aria-hidden="true" /></article>
      <article className="admin-stat"><div><span>Pagos inválidos</span><strong>{number.format(summary.invalid)}</strong><small>Comprobantes observados</small></div><XCircle size={26} aria-hidden="true" /></article>
    </section>
    <section className="admin-panel" aria-labelledby="certificates-title">
      <div className="admin-panel-heading"><div><h2 id="certificates-title">Solicitudes de certificado <span className="admin-count">{number.format(total)}</span></h2><p className="admin-muted">{active ? "Resultados según los filtros aplicados." : "Cada fila corresponde a un comprobante. Una persona puede tener más de uno."}</p></div><FileBadge size={21} aria-hidden="true" /></div>
      <DashboardFilters filters={filters} options={options} certificates />
      <div className="admin-table-scroll" role="region" aria-label="Solicitudes de certificado, desplazable horizontalmente" tabIndex={0}>
        <table className="admin-table admin-certificates-table">
          <caption className="admin-sr-only">Comprobantes para certificados, no certificados emitidos. Fechas en horario de Perú.</caption>
          <thead><tr>{["Solicitud", "Participante", "Universidad / Carrera", "Ciclo", "Ciudad", "N.º de operación", "Estado del pago", "Comprobante", "Fecha de solicitud (Perú)"].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
          <tbody>{requests.length ? requests.map(row => {
            const status = statuses[row.status] ?? { label: "Sin estado", className: "" }
            return <tr key={row.id}>
              <td className="admin-id">#{row.id}<span className="admin-cell-secondary">Inscrito #{row.registration_id}</span></td>
              <td className="admin-person">{row.nombres} {row.apellidos}<span className="admin-cell-secondary admin-mono">DNI {row.dni}</span>{row.telefono ? <span className="admin-cell-secondary">Tel. {row.telefono}</span> : null}</td>
              <td>{row.universidad}<span className="admin-cell-secondary">{row.carrera}</span></td><td className="admin-nowrap">{row.ciclo}</td><td>{row.ciudad || "—"}</td>
              <td className="admin-mono">{row.operation_number || "—"}</td>
              <td><span className={`admin-badge ${status.className}`}>{status.label}</span></td>
              <td>
                <div><Link href={`/dashboard/certificados/${row.id}`} className="admin-secondary admin-nowrap" prefetch={false} aria-label={`Revisar pago de solicitud ${row.id}`}>Revisar pago</Link></div>
                <a href={`/api/admin/certificados/${row.id}/comprobante`} target="_blank" rel="noopener noreferrer" className="admin-proof-link" aria-label={`Ver comprobante de solicitud ${row.id} (abre otra pestaña)`}>Ver comprobante <ExternalLink size={14} aria-hidden="true" /></a>
              </td>
              <td className="admin-nowrap">{row.created_at ? date.format(new Date(row.created_at)) : "—"}</td>
            </tr>
          }) : <tr><td colSpan={9}><div className="admin-empty"><Search size={30} aria-hidden="true" /><h3>{active ? "No encontramos coincidencias" : "Todavía no hay comprobantes"}</h3><p>{active ? "Probá con otros filtros o volvé a ver todas las solicitudes." : "Las solicitudes aparecerán acá cuando los participantes envíen sus comprobantes."}</p>{active ? <Link className="admin-secondary" href="/dashboard/certificados">Ver todas las solicitudes</Link> : null}</div></td></tr>}</tbody>
        </table>
      </div>
      <DashboardPagination path="/dashboard/certificados" filters={filters} total={total} page={page} pages={pages} noun="comprobantes" />
    </section>
    <p className="admin-footnote">Revisá cada comprobante para validar o rechazar el pago. No se emiten certificados desde este panel.<span>Datos personales · Uso exclusivo de administración</span></p>
  </main>
}
