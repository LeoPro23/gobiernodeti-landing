"use client"

import { startTransition, useActionState, useEffect, useOptimistic, useRef, type ReactNode } from "react"
import { yambolyAdminAction } from "./yamboly/actions"
import type { AdminFormAction } from "./form-state"

// Formulario del panel: envía a una acción del servidor, muestra el resultado y,
// a diferencia del reseteo automático de React, conserva lo escrito si hubo un error.
export function ActionForm({
  children,
  className,
  confirmMessage,
  resetOnSuccess = false,
  inlineStatus = false,
  action: serverAction = yambolyAdminAction,
}: {
  children: ReactNode
  className?: string
  confirmMessage?: string
  resetOnSuccess?: boolean
  inlineStatus?: boolean
  action?: AdminFormAction
}) {
  const [state, action, pending] = useActionState(serverAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset()
  }, [state, resetOnSuccess])

  return (
    <form
      ref={formRef}
      className={className}
      aria-busy={pending}
      onSubmit={event => {
        event.preventDefault()
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
        const message = submitter?.dataset.confirm ?? confirmMessage
        if (message && !window.confirm(message)) return
        const data = new FormData(event.currentTarget, submitter)
        startTransition(() => action(data))
      }}
    >
      <fieldset disabled={pending} className="qa-fieldset">{children}</fieldset>
      {pending && <p className="qa-status" role="status">Guardando…</p>}
      {!pending && state && (
        state.ok
          ? <p className={inlineStatus ? "qa-status qa-ok qa-inline" : "qa-status qa-ok"} role="status">{state.message}</p>
          : <div className={inlineStatus ? "qa-status qa-error qa-inline" : "qa-status qa-error"} role="alert">
              <p>{state.error}</p>
              {state.details?.length ? <ul>{state.details.map(detail => <li key={detail}>{detail}</li>)}</ul> : null}
            </div>
      )}
    </form>
  )
}

// Casilla que guarda al marcarla y vuelve atrás si el servidor rechaza el cambio.
export function ToggleCheckbox({ action, intent, id, checked, label }: { action: AdminFormAction; intent: string; id: number; checked: boolean; label: string }) {
  const [state, run, pending] = useActionState(action, null)
  const [optimistic, setOptimistic] = useOptimistic(checked)
  return (
    <label className="qa-attendance">
      <input
        type="checkbox"
        checked={optimistic}
        disabled={pending}
        aria-label={label}
        onChange={event => {
          const next = event.target.checked
          const data = new FormData()
          data.set("intent", intent)
          data.set("id", String(id))
          data.set("value", String(next))
          startTransition(() => {
            setOptimistic(next)
            run(data)
          })
        }}
      />
      {!pending && state && !state.ok ? <span className="qa-status qa-error qa-inline" role="alert">{state.error}</span> : null}
    </label>
  )
}
