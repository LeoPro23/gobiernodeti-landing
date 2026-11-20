import Link from "next/link"
import { ArrowLeft, ArrowRight, FileBadge, Search, SlidersHorizontal, Users } from "lucide-react"
import { activeFilterEntries, adminPageUrl, PAGE_SIZE, type AdminFilters, type FilterOptions } from "@/lib/admin-registrations"

export function DashboardTabs({ certificates = false }: { certificates?: boolean }) {
  return <nav className="admin-tabs" aria-label="Secciones de administración">
    <Link href="/dashboard" aria-current={!certificates ? "page" : undefined}><Users size={18} aria-hidden="true" /> Inscritos</Link>
    <Link href="/dashboard/certificados" aria-current={certificates ? "page" : undefined}><FileBadge size={18} aria-hidden="true" /> Certificados</Link>
    <span>Consulta de registros del evento</span>
  </nav>
}

function FilterSelect({ label, name, value, options, empty }: { label: string; name: string; value: string; options: string[]; empty: string }) {
  const choices = value && !options.includes(value) ? [value, ...options] : options
  return <label>{label}<select name={name} defaultValue={value}><option value="">{empty}</option>{choices.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
}

export function DashboardFilters({ filters, options, certificates = false }: { filters: AdminFilters; options: FilterOptions; certificates?: boolean }) {
  const path = certificates ? "/dashboard/certificados" : "/dashboard"
  const count = activeFilterEntries(filters, certificates).length
  return <form action={path} method="get" className="admin-filters admin-filters-expanded" key={JSON.stringify(filters)}>
    <div className="admin-filter-grid">
      <label className="admin-search">{certificates ? "Buscar solicitud" : "Buscar participante"}<div><Search size={17} aria-hidden="true" /><input name="q" defaultValue={filters.q} maxLength={150} placeholder={certificates ? "Nombre, DNI, teléfono u operación" : "Nombre, DNI, teléfono o carrera"} /></div></label>
      <FilterSelect label="Universidad" name="universidad" value={filters.universidad} options={options.universities} empty="Todas las universidades" />
      <FilterSelect label="Ciudad" name="ciudad" value={filters.ciudad} options={options.cities} empty="Todas las ciudades" />
      <FilterSelect label="Carrera" name="carrera" value={filters.carrera} options={options.careers} empty="Todas las carreras" />
      <FilterSelect label="Ciclo" name="ciclo" value={filters.ciclo} options={options.cycles} empty="Todos los ciclos" />
      {certificates ? <label>Estado del comprobante<select name="status" defaultValue={filters.status}><option value="">Todos los estados</option><option value="pending">Pendiente de revisión</option><option value="valid">Válido</option><option value="invalid">Inválido</option></select></label>
        : <label>Autorización de datos<select name="autoriza_datos" defaultValue={filters.autoriza_datos}><option value="">Todas las respuestas</option><option value="true">Sí autoriza</option><option value="false">No autoriza</option></select></label>}
    </div>
    <details className="admin-advanced" open={Boolean(filters.desde || filters.hasta || (!certificates && filters.acepta_terminos))}>
      <summary><SlidersHorizontal size={15} aria-hidden="true" /> Fechas{!certificates ? " y términos" : " de solicitud"}<span>Filtros adicionales</span></summary>
      <div className="admin-filter-grid">
        <label>Desde<input type="date" name="desde" defaultValue={filters.desde} min="0001-01-01" max="9999-12-31" /></label>
        <label>Hasta<input type="date" name="hasta" defaultValue={filters.hasta} min="0001-01-01" max="9999-12-31" /></label>
        {!certificates ? <label>Aceptación de términos<select name="acepta_terminos" defaultValue={filters.acepta_terminos}><option value="">Todas las respuestas</option><option value="true">Aceptados</option><option value="false">No aceptados</option></select></label> : null}
      </div>
      <p className="admin-filter-note">{certificates ? "Fecha de envío del comprobante" : "Fecha de inscripción"}, en horario de Perú. Ambos días están incluidos.</p>
    </details>
    <div className="admin-filter-actions"><p>{count ? `${count} filtro${count === 1 ? " activo" : "s activos"}` : "Combiná los filtros para encontrar registros específicos."}</p><div>{count ? <Link href={path} className="admin-clear">Limpiar filtros</Link> : null}<button type="submit" className="admin-primary">Aplicar filtros</button></div></div>
  </form>
}

export function DashboardPagination({ path, filters, total, page, pages, noun = "inscritos" }: { path: string; filters: AdminFilters; total: number; page: number; pages: number; noun?: string }) {
  const number = new Intl.NumberFormat("es-PE")
  return <footer className="admin-pagination">
    <p>{total ? `${number.format((page - 1) * PAGE_SIZE + 1)}–${number.format(Math.min(page * PAGE_SIZE, total))} de ${number.format(total)} ${noun}` : `0 ${noun}`}</p>
    <nav aria-label={`Páginas de ${noun}`}>
      {page > 1 ? <Link className="admin-page" href={adminPageUrl(path, filters, page - 1)}><ArrowLeft size={16} aria-hidden="true" /> Anterior</Link> : <span className="admin-page" aria-disabled="true"><ArrowLeft size={16} aria-hidden="true" /> Anterior</span>}
      <span className="admin-page-label">{page} / {pages}</span>
      {page < pages ? <Link className="admin-page" href={adminPageUrl(path, filters, page + 1)}>Siguiente <ArrowRight size={16} aria-hidden="true" /></Link> : <span className="admin-page" aria-disabled="true">Siguiente <ArrowRight size={16} aria-hidden="true" /></span>}
    </nav>
  </footer>
}
