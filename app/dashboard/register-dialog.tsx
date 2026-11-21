"use client"

import { useRef, useState, type ReactNode } from "react"
import { CheckCircle2, Pencil, UserPlus, X } from "lucide-react"
import { CARRERAS, CICLOS, CIUDADES, UNIVERSIDADES } from "@/lib/registration-options"
import { ActionForm } from "./action-form"
import type { AdminFormAction } from "./form-state"

export type EditableRegistration = {
  id: number
  nombres: string
  apellidos: string
  dni: string
  universidad: string
  carrera: string
  ciclo: string
  telefono: string | null
  ciudad: string | null
  acepta_terminos: boolean
  autoriza_datos: boolean
}

function Select({ label, name, options, value = "" }: { label: string; name: string; options: string[]; value?: string | null }) {
  // Un valor guardado que ya no está en la lista se conserva como opción para no perderlo al editar.
  const choices = value && !options.includes(value) ? [value, ...options] : options
  return <label>{label}<select name={name} defaultValue={value ?? ""}>
    <option value="">Sin especificar</option>
    {choices.map(option => <option key={option} value={option}>{option}</option>)}
  </select></label>
}

function RegistrationFields({ initial, autoFocus = false }: { initial?: EditableRegistration; autoFocus?: boolean }) {
  return <>
    <div className="qa-grid qa-grid-2">
      <label>DNI *<input name="dni" required inputMode="numeric" pattern="\d{8,12}" maxLength={12} placeholder="8 a 12 dígitos" autoComplete="off" autoFocus={autoFocus} defaultValue={initial?.dni} /></label>
      <label>Nombres *<input name="nombres" required maxLength={150} autoComplete="off" defaultValue={initial?.nombres} /></label>
      <label>Apellidos<input name="apellidos" maxLength={150} autoComplete="off" defaultValue={initial?.apellidos} /></label>
      <label>Teléfono<input name="telefono" type="tel" maxLength={30} autoComplete="off" defaultValue={initial?.telefono ?? ""} /></label>
      <Select label="Universidad" name="universidad" options={UNIVERSIDADES} value={initial?.universidad} />
      <Select label="Carrera" name="carrera" options={CARRERAS} value={initial?.carrera} />
      <Select label="Ciclo" name="ciclo" options={CICLOS} value={initial?.ciclo} />
      <Select label="Ciudad" name="ciudad" options={CIUDADES} value={initial?.ciudad} />
    </div>
    <label className="qa-check"><input type="checkbox" name="aceptaTerminos" defaultChecked={initial?.acepta_terminos ?? false} /> Aceptó los términos y condiciones del evento</label>
    <label className="qa-check"><input type="checkbox" name="autorizaDatos" defaultChecked={initial?.autoriza_datos ?? false} /> Autoriza el uso de sus datos para comunicaciones</label>
  </>
}

function Dialog({ dialogRef, titleId, title, icon, hint, onClose, children }: {
  dialogRef: React.RefObject<HTMLDialogElement | null>
  titleId: string
  title: string
  icon: ReactNode
  hint: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <dialog
      ref={dialogRef}
      className="reg-dialog"
      aria-labelledby={titleId}
      // Clic fuera del contenido (en el fondo) cierra el modal.
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="reg-dialog-body qa-page">
        <header className="reg-dialog-head">
          <h2 id={titleId}>{icon} {title}</h2>
          <button type="button" className="reg-dialog-close" onClick={onClose} aria-label="Cerrar"><X size={18} aria-hidden="true" /></button>
        </header>
        <p className="reg-dialog-hint">{hint}</p>
        {children}
      </div>
    </dialog>
  )
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

      <Dialog dialogRef={dialogRef} titleId="reg-dialog-title" title="Inscribir a una persona" icon={<UserPlus size={18} aria-hidden="true" />} hint="Solo el DNI y los nombres son obligatorios." onClose={close}>
        <ActionForm className="qa-form reg-dialog-form" resetOnSuccess action={action} onSuccess={message => { setNotice(message); close() }}>
          <input type="hidden" name="intent" value="create" />
          <RegistrationFields autoFocus />
          <label className="qa-check"><input type="checkbox" name="asistio" defaultChecked /> Marcar asistencia</label>
          <div className="qa-actions">
            <button className="admin-secondary" type="button" onClick={close}>Cancelar</button>
            <button className="admin-primary" type="submit"><UserPlus size={16} aria-hidden="true" /> Inscribir</button>
          </div>
        </ActionForm>
      </Dialog>
    </div>
  )
}

// Edición de una inscripción existente: abre el mismo formulario con los datos cargados.
export function EditRegistrationButton({ action, registration }: { action: AdminFormAction; registration: EditableRegistration }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const close = () => dialogRef.current?.close()
  const fullName = [registration.nombres, registration.apellidos].filter(Boolean).join(" ")

  return (
    <>
      <button type="button" className="admin-secondary qa-small" onClick={() => { setNotice(null); dialogRef.current?.showModal() }} aria-label={`Editar los datos de ${fullName}`}>
        <Pencil size={14} aria-hidden="true" /> Editar
      </button>
      {notice ? <span className="reg-row-notice" role="status"><CheckCircle2 size={14} aria-hidden="true" /> Guardado</span> : null}

      <Dialog dialogRef={dialogRef} titleId={`reg-edit-title-${registration.id}`} title={`Editar inscripción #${registration.id}`} icon={<Pencil size={18} aria-hidden="true" />} hint="Solo el DNI y los nombres son obligatorios. La asistencia se marca con la casilla de la tabla." onClose={close}>
        <ActionForm className="qa-form reg-dialog-form" action={action} onSuccess={message => { setNotice(message); close() }}>
          <input type="hidden" name="intent" value="update" />
          <input type="hidden" name="id" value={registration.id} />
          <RegistrationFields initial={registration} />
          <div className="qa-actions">
            <button className="admin-secondary" type="button" onClick={close}>Cancelar</button>
            <button className="admin-primary" type="submit"><Pencil size={16} aria-hidden="true" /> Guardar cambios</button>
          </div>
        </ActionForm>
      </Dialog>
    </>
  )
}
