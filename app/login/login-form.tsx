"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [visible, setVisible] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "No se pudo iniciar sesión. Intentá nuevamente.")
        setPending(false)
        return
      }
      // Full navigation discards any previously cached private page.
      window.location.replace("/dashboard")
    } catch {
      setError("No se pudo conectar. Revisá tu conexión y volvé a intentar.")
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="admin-login-form" aria-busy={pending}>
      <label htmlFor="admin-email">Correo de administrador</label>
      <input id="admin-email" name="email" type="email" autoComplete="username" placeholder="tu-correo@ejemplo.com" required maxLength={254} disabled={pending} />
      <label htmlFor="admin-password">Contraseña</label>
      <div className="admin-password">
        <input id="admin-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={256} disabled={pending} />
        <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <button className="admin-primary" type="submit" disabled={pending}>
        {pending ? "Verificando acceso…" : "Ingresar al panel"}<ArrowRight size={17} aria-hidden="true" />
      </button>
    </form>
  )
}
