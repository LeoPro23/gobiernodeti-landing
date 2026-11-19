import Link from "next/link"
import { ArrowLeft, ArrowRight, Building2, CalendarDays, ListFilter, Search, Users, RefreshCw } from "lucide-react"
import { getAdminRegistrations, PAGE_SIZE, type SearchParams } from "@/lib/admin-registrations"
import { LogoutButton } from "./logout-button"
import { YambolyLauncher } from "./yamboly-launcher"

export const runtime = "nodejs"

const number = new Intl.NumberFormat("es-PE")
const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filters, registrations, summary, options, total, page, pages } = await getAdminRegistrations(await searchParams)
  const active = Boolean(filters.q || filters.universidad || filters.ciudad)
  function pageUrl(next: number) {
    const query = new URLSearchParams()
    if (filters.q) query.set("q", filters.q)
    if (filters.universidad) query.set("universidad", filters.universidad)
    if (filters.ciudad) query.set("ciudad", filters.ciudad)
    query.set("page", String(next))
    return `/dashboard?${query}`
  }

  return (
    <>
      <header className="admin-topbar">
        <Link href="/" className="admin-brand">XII <strong>FULLDAY</strong><span>PANEL DE ADMINISTRACIÓN</span></Link>
        <div className="admin-topbar-actions">
          <YambolyLauncher />
          <span className="admin-private">Acceso privado</span>
          <LogoutButton />
        </div>
      </header>
      <main className="admin-container">
        <section className="admin-heading">
          <div><p className="admin-eyebrow">GESTIÓN DEL EVENTO / INSCRIPCIONES</p><h1>Los próximos protagonistas.</h1><p className="admin-muted">Todos los inscritos al XII FULLDAY, en un solo lugar.</p></div>
          <a href={pageUrl(page)} className="admin-secondary"><RefreshCw size={16} aria-hidden="true" /> Actualizar datos</a>
        </section>

        <section className="admin-stats" aria-label="Resumen general de inscripciones">
          <article className="admin-stat admin-stat-featured"><div><span>Total de inscritos</span><strong>{number.format(summary.total)}</strong><small>Registros del evento</small></div><Users size={30} aria-hidden="true" /></article>
          <article className="admin-stat"><div><span>Inscritos hoy</span><strong>{number.format(summary.today)}</strong><small>Horario de Perú · UTC−5</small></div><CalendarDays size={26} aria-hidden="true" /></article>
          <article className="admin-stat"><div><span>Universidades</span><strong>{number.format(summary.universities)}</strong><small>Representadas en el evento</small></div><Building2 size={26} aria-hidden="true" /></article>
        </section>

        <section className="admin-panel" aria-labelledby="registrations-title">
          <div className="admin-panel-heading"><div><h2 id="registrations-title">Registro de participantes <span className="admin-count">{number.format(total)}</span></h2><p className="admin-muted">{active ? "Resultados según los filtros aplicados." : "Más recientes primero. Solo consulta; no se modifican registros."}</p></div><ListFilter size={21} aria-hidden="true" /></div>
          <form action="/dashboard" method="get" className="admin-filters" key={`${filters.q}|${filters.universidad}|${filters.ciudad}`}>
            <label className="admin-search">Buscar participante<div><Search size={17} aria-hidden="true" /><input name="q" defaultValue={filters.q} maxLength={150} placeholder="Nombre, DNI o carrera" /></div></label>
            <label>Universidad<select name="universidad" defaultValue={filters.universidad}><option value="">Todas las universidades</option>{options.universities.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Ciudad<select name="ciudad" defaultValue={filters.ciudad}><option value="">Todas las ciudades</option>{options.cities.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <button type="submit" className="admin-primary">Filtrar</button>
            {active ? <Link href="/dashboard" className="admin-clear">Limpiar</Link> : null}
          </form>
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
          <footer className="admin-pagination">
            <p>{total ? `${number.format((page - 1) * PAGE_SIZE + 1)}–${number.format(Math.min(page * PAGE_SIZE, total))} de ${number.format(total)} inscritos` : "0 inscritos"}</p>
            <nav aria-label="Páginas de inscritos">
              {page > 1 ? <Link className="admin-page" href={pageUrl(page - 1)}><ArrowLeft size={16} aria-hidden="true" /> Anterior</Link> : <span className="admin-page" aria-disabled="true"><ArrowLeft size={16} aria-hidden="true" /> Anterior</span>}
              <span className="admin-page-label">{page} / {pages}</span>
              {page < pages ? <Link className="admin-page" href={pageUrl(page + 1)}>Siguiente <ArrowRight size={16} aria-hidden="true" /></Link> : <span className="admin-page" aria-disabled="true">Siguiente <ArrowRight size={16} aria-hidden="true" /></span>}
            </nav>
          </footer>
        </section>
        <p className="admin-footnote">XII FULLDAY · Universidad Nacional de Trujillo <span>Datos personales · Uso exclusivo de administración</span></p>
      </main>
    </>
  )
}
