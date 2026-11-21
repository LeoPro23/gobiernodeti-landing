"use client"

import { useEffect, useRef, useState } from "react"
import { Download, FileText, Loader2, Plus, SlidersHorizontal, Trash2, X } from "lucide-react"
import type { FilterOptions } from "@/lib/admin-registrations"
import {
  DEFAULT_EXPORT_FILTER,
  EXPORT_FIELDS,
  parseExportFilter,
  serializeExportFilter,
  UNT_TENTH_CYCLE_RULE,
  type ExportField,
  type ExportFilter,
  type ExportRule,
} from "@/lib/export-rules"

const STORAGE_KEY = "fullday-export-filter"
const ENDPOINT = "/api/dashboard/asistentes"

function loadFilter(): ExportFilter {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    // Una cadena vacía también es una elección guardada («sin reglas»); solo null usa la regla por defecto.
    if (saved !== null) {
      const params = new URLSearchParams(saved)
      return parseExportFilter({ reglas: params.get("reglas"), solo_asistentes: params.get("solo_asistentes") })
    }
  } catch {}
  return DEFAULT_EXPORT_FILTER
}

function saveFilter(filter: ExportFilter) {
  try { localStorage.setItem(STORAGE_KEY, serializeExportFilter(filter).toString()) } catch {}
}

const sameRule = (a: ExportRule, b: ExportRule) =>
  a.mode === b.mode && EXPORT_FIELDS.every(({ key }) => (a[key] ?? "") === (b[key] ?? ""))

// Exportación de inscritos para el sorteo con reglas de incluir/excluir y vista previa del total.
export function ExportDialog({ options }: { options: FilterOptions }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [filter, setFilter] = useState<ExportFilter>(DEFAULT_EXPORT_FILTER)
  const [total, setTotal] = useState<number | null>(null)
  const [countError, setCountError] = useState(false)
  const query = serializeExportFilter(filter).toString()
  const fieldOptions: Record<ExportField, string[]> = {
    universidad: options.universities,
    carrera: options.careers,
    ciclo: options.cycles,
    ciudad: options.cities,
  }

  const update = (next: ExportFilter) => {
    setFilter(next)
    saveFilter(next)
  }
  const updateRule = (index: number, patch: Partial<ExportRule>) =>
    update({ ...filter, rules: filter.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)) })

  // Vista previa: cuántas personas saldrían con las reglas actuales.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${ENDPOINT}?${query}${query ? "&" : ""}formato=conteo`, { cache: "no-store" })
        const json = await res.json()
        if (!cancelled) {
          setTotal(res.ok ? json.total : null)
          setCountError(!res.ok)
        }
      } catch {
        if (!cancelled) setCountError(true)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const close = () => dialogRef.current?.close()
  const href = (format: "xlsx" | "txt") => `${ENDPOINT}?${query}${query ? "&" : ""}formato=${format}`
  const hasUntRule = filter.rules.some(rule => sameRule(rule, UNT_TENTH_CYCLE_RULE))

  return (
    <>
      <button type="button" className="admin-secondary" onClick={() => { setFilter(loadFilter()); dialogRef.current?.showModal() }}>
        <Download size={16} aria-hidden="true" /> Exportar asistentes
      </button>

      <dialog ref={dialogRef} className="reg-dialog reg-export-dialog" aria-labelledby="export-dialog-title" onClick={event => { if (event.target === event.currentTarget) close() }}>
        <div className="reg-dialog-body qa-page">
          <header className="reg-dialog-head">
            <h2 id="export-dialog-title"><SlidersHorizontal size={18} aria-hidden="true" /> Exportar para el sorteo</h2>
            <button type="button" className="reg-dialog-close" onClick={close} aria-label="Cerrar"><X size={18} aria-hidden="true" /></button>
          </header>
          <p className="reg-dialog-hint">
            Cada regla se cumple cuando coinciden todos los campos elegidos. Si hay reglas de <strong>Incluir</strong>, la persona debe cumplir al menos una; y no debe cumplir ninguna de <strong>Excluir</strong>.
          </p>

          <div className="reg-export-body">
            <label className="qa-check">
              <input type="checkbox" checked={filter.onlyAttended} onChange={event => update({ ...filter, onlyAttended: event.target.checked })} />
              Solo personas con asistencia marcada
            </label>

            {filter.rules.length ? (
              <ol className="reg-export-rules">
                {filter.rules.map((rule, index) => (
                  <li key={index} className={rule.mode === "exclude" ? "is-exclude" : "is-include"}>
                    <label className="reg-export-mode">
                      <span className="admin-sr-only">Tipo de regla {index + 1}</span>
                      <select value={rule.mode} onChange={event => updateRule(index, { mode: event.target.value as ExportRule["mode"] })}>
                        <option value="include">Incluir</option>
                        <option value="exclude">Excluir</option>
                      </select>
                    </label>
                    {EXPORT_FIELDS.map(({ key, label }) => {
                      const value = rule[key] ?? ""
                      const choices = value && !fieldOptions[key].includes(value) ? [value, ...fieldOptions[key]] : fieldOptions[key]
                      return (
                        <label key={key}>
                          <span className="admin-sr-only">{label} de la regla {index + 1}</span>
                          <select value={value} onChange={event => updateRule(index, { [key]: event.target.value || undefined })}>
                            <option value="">{label}: cualquiera</option>
                            {choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
                          </select>
                        </label>
                      )
                    })}
                    <button type="button" className="reg-export-remove" onClick={() => update({ ...filter, rules: filter.rules.filter((_, i) => i !== index) })} aria-label={`Quitar la regla ${index + 1}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="reg-export-empty">Sin reglas: se exportan todas las personas{filter.onlyAttended ? " con asistencia marcada" : ""}.</p>
            )}

            <div className="reg-export-add">
              <button type="button" className="admin-secondary qa-small" onClick={() => update({ ...filter, rules: [...filter.rules, { mode: "exclude" }] })}>
                <Plus size={14} aria-hidden="true" /> Agregar regla
              </button>
              {!hasUntRule && (
                <button type="button" className="admin-secondary qa-small" onClick={() => update({ ...filter, rules: [...filter.rules, UNT_TENTH_CYCLE_RULE] })}>
                  <Plus size={14} aria-hidden="true" /> Excluir 10.° ciclo de la UNT
                </button>
              )}
            </div>
            {filter.rules.some(rule => EXPORT_FIELDS.every(({ key }) => !rule[key])) && (
              <p className="reg-export-note">Las reglas sin ningún campo elegido no se aplican.</p>
            )}
          </div>

          <footer className="reg-export-footer">
            <p role="status" aria-live="polite">
              {countError ? "No se pudo calcular el total." : total === null ? <><Loader2 size={15} className="reg-live-spin" aria-hidden="true" /> Calculando…</> : <>Se exportarán <strong>{total}</strong> persona{total === 1 ? "" : "s"}.</>}
            </p>
            <div className="qa-actions">
              <a className="admin-secondary" href={href("txt")} download><FileText size={16} aria-hidden="true" /> Descargar TXT</a>
              <a className="admin-primary" href={href("xlsx")} download><Download size={16} aria-hidden="true" /> Descargar Excel</a>
            </div>
          </footer>
        </div>
      </dialog>
    </>
  )
}
