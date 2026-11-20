"use client"

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react"
import { yambolyAdminAction } from "./actions"

// Formulario del panel del quiz: envía al despachador del servidor, muestra el resultado y,
// a diferencia del reseteo automático de React, conserva lo escrito si hubo un error.
export function ActionForm({
  children,
  className,
  confirmMessage,
  resetOnSuccess = false,
  inlineStatus = false,
}: {
  children: ReactNode
  className?: string
  confirmMessage?: string
  resetOnSuccess?: boolean
  inlineStatus?: boolean
}) {
  const [state, action, pending] = useActionState(yambolyAdminAction, null)
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
