"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  async function logout() {
    setPending(true)
    setError(false)
    try {
      const response = await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      if (!response.ok) throw new Error("Logout failed")
      window.location.replace("/login")
    } catch {
      setError(true)
      setPending(false)
    }
  }
  return <div>
    <button className="admin-secondary" onClick={logout} disabled={pending}><LogOut size={16} aria-hidden="true" />{pending ? "Saliendo…" : "Cerrar sesión"}</button>
    {error ? <p role="alert" className="admin-error">No se pudo cerrar la sesión. Intentá otra vez.</p> : null}
  </div>
}
