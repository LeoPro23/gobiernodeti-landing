"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2, Search, X } from "lucide-react"

const DEBOUNCE_MS = 300

// Buscador que filtra mientras se escribe: actualiza ?q= en la URL (conservando los demás
// filtros y volviendo a la página 1) y el servidor vuelve a consultar la tabla.
export function LiveSearch({ initial, label, placeholder, maxLength = 150 }: { initial: string; label: string; placeholder: string; maxLength?: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(initial)
  // Última búsqueda enviada y último valor recibido del servidor, para distinguir
  // nuestras propias navegaciones de un cambio externo (por ejemplo, «Limpiar filtros»).
  const [sent, setSent] = useState(initial)
  const [received, setReceived] = useState(initial)
  if (initial !== received) {
    setReceived(initial)
    if (initial !== sent) {
      setValue(initial)
      setSent(initial)
    }
  }

  useEffect(() => {
    const query = value.trim()
    if (query === sent) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (query) params.set("q", query)
      else params.delete("q")
      params.delete("page")
      setSent(query)
      startTransition(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, sent, pathname, router])

  return (
    <form role="search" className="admin-search reg-live-search" onSubmit={event => event.preventDefault()}>
      <label htmlFor="live-search">{label}</label>
      <div>
        {pending ? <Loader2 size={17} aria-hidden="true" className="reg-live-spin" /> : <Search size={17} aria-hidden="true" />}
        <input
          id="live-search"
          type="search"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => { if (event.key === "Escape") setValue("") }}
        />
        {value ? <button type="button" className="reg-live-clear" onClick={() => setValue("")} aria-label="Borrar búsqueda"><X size={16} aria-hidden="true" /></button> : null}
      </div>
      <span className="admin-sr-only" aria-live="polite">{pending ? "Buscando…" : ""}</span>
    </form>
  )
}
