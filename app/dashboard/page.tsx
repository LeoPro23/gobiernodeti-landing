import Link from "next/link"
import { Building2, CalendarDays, ListFilter, Search, Users, RefreshCw } from "lucide-react"
import { activeFilterEntries, adminPageUrl, getAdminRegistrations, type SearchParams } from "@/lib/admin-registrations"
import { DashboardFilters, DashboardPagination, DashboardTabs } from "./dashboard-ui"

export const runtime = "nodejs"

const number = new Intl.NumberFormat("es-PE")
const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filters, registrations, summary, options, total, page, pages } = await getAdminRegistrations(await searchParams)
  const active = activeFilterEntries(filters).length > 0

  return (
    <>
      <main className="admin-container">
        <DashboardTabs />
        <section className="admin-heading">
          <div><p className="admin-eyebrow">GESTIÓN DEL EVENTO / INSCRIPCIONES</p><h1>Los próximos protagonistas.</h1><p className="admin-muted">Todos los inscritos al XII FULLDAY, en un solo lugar.</p></div>
          <a href={adminPageUrl("/dashboard", filters, page)} className="admin-secondary"><RefreshCw size={16} aria-hidden="true" /> Actualizar datos</a>
        </section>

        <section className="admin-stats" aria-label="Resumen general de inscripciones">
          <article className="admin-stat admin-stat-featured"><div><span>Total de inscritos</span><strong>{number.format(summary.total)}</strong><small>Registros del evento</small></div><Users size={30} aria-hidden="true" /></article>
          <article className="admin-stat"><div><span>Inscritos hoy</span><strong>{number.format(summary.today)}</strong><small>Horario de Perú · UTC−5</small></div><CalendarDays size={26} aria-hidden="true" /></article>
          <article className="admin-stat"><div><span>Universidades</span><strong>{number.format(summary.universities)}</strong><small>Representadas en el evento</small></div><Building2 size={26} aria-hidden="true" /></article>
        </section>

        <section className="admin-panel" aria-labelledby="registrations-title">
          <div className="admin-panel-heading"><div><h2 id="registrations-title">Registro de participantes <span className="admin-count">{number.format(total)}</span></h2><p className="admin-muted">{active ? "Resultados según los filtros aplicados." : "Más recientes primero. Solo consulta; no se modifican registros."}</p></div><ListFilter size={21} aria-hidden="true" /></div>
          <DashboardFilters filters={filters} options={options} />
          <div className="admin-table-scroll" role="region" aria-label="Lista de inscritos, desplazable horizontalmente" tabIndex={0}>
            <table className="admin-table">
              <caption className="admin-sr-only">Inscritos al XII FULLDAY. Fechas en horario de Perú.</caption>
              <thead><tr>{["ID", "Nombres", "Apellidos", "DNI", "Universidad", "Carrera", "Ciclo", "Teléfono", "Ciudad", "Términos", "Autoriza datos", "Fecha de registro (Perú)"].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
              <tbody>{registrations.length ? registrations.map(row => (
                <tr key={row.id}>
                  <td className="admin-id">#{row.id}</td><td className="admin-person">{row.nombres}</td><td className="admin-person">{row.apellidos}</td><td className="admin-mono">{row.dni}</td>
                  <td>{row.universidad}</td><td>{row.carrera}</td><td className="admin-nowrap">{row.ciclo}</td><td className="admin-mono admin-nowrap">{row.telefono || "—"}</td><td>{row.ciudad || "—"}</td>
                  <td><span className={row.acepta_terminos ? "admin-badge admin-badge-yes" : "admin-badge"}>{row.acepta_terminos ? "Aceptados" : "No acepta"}</span></td>
                  <td><span className={row.autoriza_datos ? "admin-badge admin-badge-yes" : "admin-badge"}>{row.autoriza_datos ? "Sí" : "No"}</span></td>
                  <td className="admin-nowrap">{row.created_at ? date.format(new Date(row.created_at)) : "—"}</td>
                </tr>
              )) : <tr><td colSpan={12}><div className="admin-empty"><Search size={30} aria-hidden="true" /><h3>{active ? "No encontramos coincidencias" : "Todavía no hay inscritos"}</h3><p>{active ? "Probá otra búsqueda o limpiá los filtros para ver todos los participantes." : "Los nuevos registros aparecerán acá cuando se inscriban al evento."}</p>{active ? <Link className="admin-secondary" href="/dashboard">Ver todos los inscritos</Link> : null}</div></td></tr>}</tbody>
            </table>
          </div>
          <DashboardPagination path="/dashboard" filters={filters} total={total} page={page} pages={pages} />
        </section>
        <p className="admin-footnote">XII FULLDAY · Universidad Nacional de Trujillo <span>Datos personales · Uso exclusivo de administración</span></p>
      </main>
    </>
  )
}
