"use client"

import { useMemo, useSyncExternalStore } from "react"
import { Columns3 } from "lucide-react"

export type ColumnOption = { key: string; label: string }

const CHANGE_EVENT = "admin-columns-change"
// Respaldo en memoria si el navegador bloquea localStorage (ventana privada, etc.).
const memory = new Map<string, string>()

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

function read(storageKey: string) {
  try {
    const value = localStorage.getItem(storageKey)
    if (value !== null) return value
  } catch {}
  return memory.get(storageKey) ?? "[]"
}

// Selector de columnas visibles de una tabla. Oculta con CSS las celdas marcadas con data-col,
// así la tabla sigue renderizándose en el servidor. La elección se recuerda en este navegador.
export function ColumnPicker({ tableId, storageKey, columns, presets = [] }: {
  tableId: string
  storageKey: string
  columns: ColumnOption[]
  presets?: { label: string; visible: string[] }[]
}) {
  const raw = useSyncExternalStore(subscribe, () => read(storageKey), () => "[]")
  const hidden = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((key): key is string => columns.some(column => column.key === key)) : []
    } catch {
      return []
    }
  }, [raw, columns])

  const write = (next: string[]) => {
    const value = JSON.stringify(next)
    memory.set(storageKey, value)
    try { localStorage.setItem(storageKey, value) } catch {}
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
  const toggle = (key: string) => {
    if (hidden.includes(key)) return write(hidden.filter(item => item !== key))
    if (hidden.length >= columns.length - 1) return // siempre queda al menos una columna
    write([...hidden, key])
  }
  const visibleCount = columns.length - hidden.length

  return (
    <details className="admin-columns">
      <summary><Columns3 size={16} aria-hidden="true" /> Columnas <span>{visibleCount} de {columns.length}</span></summary>
      <div className="admin-columns-menu">
        <div className="admin-columns-presets">
          {presets.map(preset => (
            <button key={preset.label} type="button" className="admin-secondary qa-small" onClick={() => write(columns.map(c => c.key).filter(key => !preset.visible.includes(key)))}>{preset.label}</button>
          ))}
          <button type="button" className="admin-secondary qa-small" onClick={() => write([])}>Mostrar todas</button>
        </div>
        <fieldset>
          <legend className="admin-sr-only">Columnas visibles</legend>
          {columns.map(column => (
            <label key={column.key}>
              <input type="checkbox" checked={!hidden.includes(column.key)} onChange={() => toggle(column.key)} /> {column.label}
            </label>
          ))}
        </fieldset>
      </div>
      {/* Con columnas ocultas, la tabla deja su ancho mínimo fijo y se ajusta al contenido visible. */}
      {hidden.length ? <style>{`#${tableId}{min-width:0}${hidden.map(key => `#${tableId} [data-col="${key}"]{display:none}`).join("")}`}</style> : null}
    </details>
  )
}
