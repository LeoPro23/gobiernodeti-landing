"use client"

import Link from "next/link"

export default function DashboardError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="admin-container"><section className="admin-panel admin-empty" role="alert">
    <p className="admin-eyebrow">PANEL DE ADMINISTRACIÓN</p>
    <h1>No se pudieron cargar los datos.</h1>
    <p>Intenta nuevamente.</p>
    <button className="admin-primary" onClick={retry}>Volver a intentar</button>
    <Link className="admin-clear" href="/login">Volver al acceso</Link>
  </section></main>
}
