import Link from "next/link"
import { Building2, CalendarDays, CheckSquare, FileCheck2, ListFilter, Search, Users, RefreshCw } from "lucide-react"
import { activeFilterEntries, adminPageUrl, getAdminRegistrations, type SearchParams } from "@/lib/admin-registrations"
import { DashboardFilters, DashboardPagination, DashboardTabs } from "./dashboard-ui"
import { ActionForm, ToggleCheckbox } from "./action-form"
import { registrationAdminAction } from "./actions"
import { ColumnPicker, type ColumnOption } from "./column-picker"
import { LiveSearch } from "./live-search"
import { RegisterDialog } from "./register-dialog"

export const runtime = "nodejs"

const number = new Intl.NumberFormat("es-PE")
const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })

const COLUMNS: ColumnOption[] = [
  { key: "asistencia", label: "Asistencia" },
  { key: "id", label: "ID" },
  { key: "nombres", label: "Nombres" },
  { key: "apellidos", label: "Apellidos" },
  { key: "dni", label: "DNI" },
  { key: "universidad", label: "Universidad" },
  { key: "carrera", label: "Carrera" },
  { key: "ciclo", label: "Ciclo" },
  { key: "telefono", label: "Teléfono" },
  { key: "ciudad", label: "Ciudad" },
  { key: "terminos", label: "Términos" },
  { key: "autoriza", label: "Autoriza datos" },
  { key: "fecha", label: "Fecha de registro (Perú)" },
  { key: "origen", label: "Origen" },
  { key: "acciones", label: "Acciones" },
]

const PRESETS = [
  { label: "Solo nombre y DNI", visible: ["nombres", "apellidos", "dni"] },
  { label: "Control de asistencia", visible: ["asistencia", "nombres", "apellidos", "dni"] },
]

/** Las inscripciones hechas desde el panel pueden dejar campos vacíos. */
const orDash = (value: string | null) => value || "—"

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filters, registrations, summary, options, total, page, pages } = await getAdminRegistrations(await searchParams)
  const active = activeFilterEntries(filters).length > 0

  return (
    <>
      <main className="admin-container">
        <DashboardTabs />
        <section className="admin-heading">
          <div><p className="admin-eyebrow">GESTIÓN DEL EVENTO / INSCRIPCIONES</p><h1>Los próximos protagonistas.</h1><p className="admin-muted">Todos los inscritos al XII FULLDAY, en un solo lugar.</p></div>
          <div className="admin-heading-actions">
            <Link href="/dashboard/certificados" className="admin-primary"><FileCheck2 size={16} aria-hidden="true" /> Revisar certificados</Link>
            <a href={adminPageUrl("/dashboard", filters, page)} className="admin-secondary"><RefreshCw size={16} aria-hidden="true" /> Actualizar datos</a>
          </div>
        </section>

        <section className="admin-stats admin-stats-four" aria-label="Resumen general de inscripciones">
          <article className="admin-stat admin-stat-featured"><div><span>Total de inscritos</span><strong>{number.format(summary.total)}</strong><small>Registros del evento</small></div><Users size={30} aria-hidden="true" /></article>
          <article className="admin-stat"><div><span>Asistencia marcada</span><strong>{number.format(summary.attended)}</strong><small>{summary.total ? `${Math.round((summary.attended / summary.total) * 100)}% de los inscritos` : "Aún sin inscritos"}</small></div><CheckSquare size={26} aria-hidden="true" /></article>
          <article className="admin-stat"><div><span>Inscritos hoy</span><strong>{number.format(summary.today)}</strong><small>Horario de Perú · UTC−5</small></div><CalendarDays size={26} aria-hidden="true" /></article>
          <article className="admin-stat"><div><span>Universidades</span><strong>{number.format(summary.universities)}</strong><small>Representadas en el evento</small></div><Building2 size={26} aria-hidden="true" /></article>
        </section>

        <section className="admin-panel" aria-labelledby="registrations-title">
          <div className="admin-panel-heading"><div><h2 id="registrations-title">Registro de participantes <span className="admin-count">{number.format(total)}</span></h2><p className="admin-muted">{active ? "Resultados según los filtros aplicados." : "Más recientes primero. Marca la asistencia con la casilla de cada fila."}</p></div><ListFilter size={21} aria-hidden="true" /></div>
          <DashboardFilters filters={filters} options={options} search={false} />

          <div className="reg-admin-tools">
            <RegisterDialog action={registrationAdminAction} />
          </div>

          <div className="reg-table-bar">
            <LiveSearch initial={filters.q} label="Buscar participante" placeholder="Nombre, DNI, teléfono o carrera" />
            <ColumnPicker tableId="registrations-table" storageKey="fullday-admin-columns" columns={COLUMNS} presets={PRESETS} />
          </div>

          <div className="admin-table-scroll qa-page" role="region" aria-label="Lista de inscritos, desplazable horizontalmente" tabIndex={0}>
            <table className="admin-table" id="registrations-table">
              <caption className="admin-sr-only">Inscritos al XII FULLDAY. Fechas en horario de Perú.</caption>
              <thead><tr>{COLUMNS.map(column => <th key={column.key} scope="col" data-col={column.key}>{column.label}</th>)}</tr></thead>
              <tbody>{registrations.length ? registrations.map(row => (
                <tr key={row.id}>
                  <td data-col="asistencia"><ToggleCheckbox action={registrationAdminAction} intent="attendance" id={row.id} checked={row.asistio} label={`Asistencia de ${row.nombres} ${row.apellidos}`} /></td>
                  <td data-col="id" className="admin-id">#{row.id}</td><td data-col="nombres" className="admin-person">{row.nombres}</td><td data-col="apellidos" className="admin-person">{orDash(row.apellidos)}</td><td data-col="dni" className="admin-mono">{row.dni}</td>
                  <td data-col="universidad">{orDash(row.universidad)}</td><td data-col="carrera">{orDash(row.carrera)}</td><td data-col="ciclo" className="admin-nowrap">{orDash(row.ciclo)}</td><td data-col="telefono" className="admin-mono admin-nowrap">{orDash(row.telefono)}</td><td data-col="ciudad">{orDash(row.ciudad)}</td>
                  <td data-col="terminos"><span className={row.acepta_terminos ? "admin-badge admin-badge-yes" : "admin-badge"}>{row.acepta_terminos ? "Aceptados" : "No acepta"}</span></td>
                  <td data-col="autoriza"><span className={row.autoriza_datos ? "admin-badge admin-badge-yes" : "admin-badge"}>{row.autoriza_datos ? "Sí" : "No"}</span></td>
                  <td data-col="fecha" className="admin-nowrap">{row.created_at ? date.format(new Date(row.created_at)) : "—"}</td>
                  <td data-col="origen" className="admin-nowrap">{row.origen === "panel" ? "Panel" : "Web"}</td>
                  <td data-col="acciones">{row.has_payment
                    ? <span className="admin-cell-secondary" title="Tiene comprobantes de certificado">Con certificado</span>
                    : <ActionForm inlineStatus action={registrationAdminAction} confirmMessage={`¿Quitar la inscripción de ${row.nombres} ${row.apellidos} (DNI ${row.dni})? Esta acción no se puede deshacer.`}>
                        <input type="hidden" name="intent" value="delete" /><input type="hidden" name="id" value={row.id} />
                        <button className="admin-secondary qa-small qa-danger" type="submit">Quitar</button>
                      </ActionForm>}
                  </td>
                </tr>
              )) : <tr><td colSpan={COLUMNS.length}><div className="admin-empty"><Search size={30} aria-hidden="true" /><h3>{active ? "No encontramos coincidencias" : "Todavía no hay inscritos"}</h3><p>{active ? "Probá otra búsqueda o limpiá los filtros para ver todos los participantes." : "Los nuevos registros aparecerán acá cuando se inscriban al evento."}</p>{active ? <Link className="admin-secondary" href="/dashboard">Ver todos los inscritos</Link> : null}</div></td></tr>}</tbody>
            </table>
          </div>
          <DashboardPagination path="/dashboard" filters={filters} total={total} page={page} pages={pages} />
        </section>
        <p className="admin-footnote">XII FULLDAY · Universidad Nacional de Trujillo <span>Datos personales · Uso exclusivo de administración</span></p>
      </main>
    </>
  )
}
