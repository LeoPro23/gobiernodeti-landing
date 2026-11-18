import type { Metadata } from "next"
import type { ReactNode } from "react"
import "../admin.css"

export const metadata: Metadata = {
  title: "Inscritos | Administración XII FULLDAY",
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">{children}</div>
}
