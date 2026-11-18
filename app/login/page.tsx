import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react"
import { isAdmin } from "@/lib/admin-auth"
import { LoginForm } from "./login-form"
import "../admin.css"

export const metadata: Metadata = {
  title: "Acceso de administración | XII FULLDAY",
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  if (await isAdmin()) redirect("/dashboard")
  return (
    <main className="admin-root admin-login">
      <div className="admin-login-card">
        <Link href="/" className="admin-back"><ArrowLeft size={16} aria-hidden="true" /> Volver al evento</Link>
        <div className="admin-brand">XII <strong>FULLDAY</strong><span>GESTIÓN DE TI · UNT</span></div>
        <div className="admin-lock"><LockKeyhole size={25} aria-hidden="true" /></div>
        <p className="admin-eyebrow">SOLO ADMINISTRADORES</p>
        <h1>Todo listo para<br />recibir a los inscritos.</h1>
        <p className="admin-muted">Ingresá para consultar los registros del evento.</p>
        <LoginForm />
        <p className="admin-security"><ShieldCheck size={16} aria-hidden="true" /> Acceso privado · Sesión de 8 horas</p>
      </div>
    </main>
  )
}
