import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import "../admin.css"

export const metadata: Metadata = {
  title: "Inscritos | Administración XII FULLDAY",
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">
    <header className="admin-topbar">
      <Link href="/" className="admin-brand">XII <strong>FULLDAY</strong><span>PANEL DE ADMINISTRACIÓN</span></Link>
      <div className="admin-topbar-actions"><span className="admin-private">Acceso privado</span><LogoutButton /></div>
    </header>
    {children}
  </div>
}
