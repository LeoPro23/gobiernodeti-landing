"use client"

import { useRef, useState } from "react"
import { CheckCircle2, UserPlus, X } from "lucide-react"
import { CARRERAS, CICLOS, CIUDADES, UNIVERSIDADES } from "@/lib/registration-options"
import { ActionForm } from "./action-form"
import type { AdminFormAction } from "./form-state"

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label>{label}<select name={name} defaultValue="">
    <option value="">Sin especificar</option>
    {options.map(option => <option key={option} value={option}>{option}</option>)}
  </select></label>
}

// Inscripción manual al Fullday en un modal. Solo DNI y nombres son obligatorios.
export function RegisterDialog({ action }: { action: AdminFormAction }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const close = () => dialogRef.current?.close()

  return (
    <div className="reg-register">
      <button type="button" className="admin-primary" onClick={() => { setNotice(null); dialogRef.current?.showModal() }}>
        <UserPlus size={16} aria-hidden="true" /> Inscribir a una persona
      </button>
      {notice ? <p className="reg-register-notice" role="status"><CheckCircle2 size={16} aria-hidden="true" /> {notice}</p> : null}

      <dialog
        ref={dialogRef}
        className="reg-dialog"
        aria-labelledby="reg-dialog-title"
        // Clic fuera del contenido (en el fondo) cierra el modal.
        onClick={event => { if (event.target === event.currentTarget) close() }}
      >
        <div className="reg-dialog-body qa-page">
          <header className="reg-dialog-head">
            <h2 id="reg-dialog-title"><UserPlus size={18} aria-hidden="true" /> Inscribir a una persona</h2>
            <button type="button" className="reg-dialog-close" onClick={close} aria-label="Cerrar"><X size={18} aria-hidden="true" /></button>
          </header>
          <p className="reg-dialog-hint">Solo el DNI y los nombres son obligatorios.</p>
          <ActionForm className="qa-form reg-dialog-form" resetOnSuccess action={action} onSuccess={message => { setNotice(message); close() }}>
            <input type="hidden" name="intent" value="create" />
            <div className="qa-grid qa-grid-2">
              <label>DNI *<input name="dni" required inputMode="numeric" pattern="\d{8,12}" maxLength={12} placeholder="8 a 12 dígitos" autoComplete="off" autoFocus /></label>
              <label>Nombres *<input name="nombres" required maxLength={150} autoComplete="off" /></label>
              <label>Apellidos<input name="apellidos" maxLength={150} autoComplete="off" /></label>
              <label>Teléfono<input name="telefono" type="tel" maxLength={30} autoComplete="off" /></label>
              <Select label="Universidad" name="universidad" options={UNIVERSIDADES} />
              <Select label="Carrera" name="carrera" options={CARRERAS} />
              <Select label="Ciclo" name="ciclo" options={CICLOS} />
              <Select label="Ciudad" name="ciudad" options={CIUDADES} />
            </div>
            <label className="qa-check"><input type="checkbox" name="aceptaTerminos" /> Aceptó los términos y condiciones del evento</label>
            <label className="qa-check"><input type="checkbox" name="autorizaDatos" /> Autoriza el uso de sus datos para comunicaciones</label>
            <label className="qa-check"><input type="checkbox" name="asistio" defaultChecked /> Marcar asistencia</label>
            <div className="qa-actions">
              <button className="admin-secondary" type="button" onClick={close}>Cancelar</button>
              <button className="admin-primary" type="submit"><UserPlus size={16} aria-hidden="true" /> Inscribir</button>
            </div>
          </ActionForm>
        </div>
      </dialog>
    </div>
  )
}
