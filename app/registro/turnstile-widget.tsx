"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"

interface TurnstileOptions {
  sitekey: string
  action: string
  language: string
  theme: "dark"
  size: "flexible" | "compact"
  "response-field": boolean
  "refresh-expired": "auto"
  "refresh-timeout": "auto"
  callback: (token: string) => void
  "expired-callback": () => void
  "timeout-callback": () => void
  "error-callback": () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({ siteKey, onTokenChange }: {
  siteKey: string
  onTokenChange: (token: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenChangeRef = useRef(onTokenChange)
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.turnstile)
  const [scriptAttempt, setScriptAttempt] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange
  }, [onTokenChange])

  useEffect(() => {
    const api = window.turnstile
    const container = containerRef.current
    if (!scriptReady || !api || !container) return

    let active = true
    const invalidate = (message: string) => {
      if (!active) return
      onTokenChangeRef.current(null)
      setError(message)
    }

    let widgetId: string
    try {
      widgetId = api.render(container, {
        sitekey: siteKey,
        action: "registro",
        language: "es",
        theme: "dark",
        // Flexible widgets have a 300px minimum; compact also fits narrow phones.
        size: container.clientWidth >= 300 ? "flexible" : "compact",
        "response-field": false,
        "refresh-expired": "auto",
        "refresh-timeout": "auto",
        callback: token => {
          if (!active) return
          setError(null)
          onTokenChangeRef.current(token)
        },
        "expired-callback": () => invalidate("La verificación venció. Se está renovando para que puedas continuar."),
        "timeout-callback": () => invalidate("La verificación tardó demasiado. Por favor, inténtalo de nuevo."),
        "error-callback": () => invalidate("No se pudo completar la verificación. Revisa tu conexión e inténtalo de nuevo."),
      })
    } catch {
      queueMicrotask(() => invalidate("No se pudo iniciar la verificación. Por favor, inténtalo de nuevo."))
      return () => { active = false }
    }
    widgetIdRef.current = widgetId

    return () => {
      active = false
      widgetIdRef.current = null
      api.remove(widgetId)
      onTokenChangeRef.current(null)
    }
  }, [scriptReady, siteKey])

  const handleRetry = () => {
    setError(null)
    onTokenChangeRef.current(null)
    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current)
    } else {
      setScriptReady(false)
      setScriptAttempt(attempt => attempt + 1)
    }
  }

  const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" +
    (scriptAttempt ? `&retry=${scriptAttempt}` : "")

  return (
    <div className="reg-turnstile" aria-label="Verificación de seguridad">
      <Script
        key={scriptAttempt}
        src={scriptUrl}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => {
          if (window.turnstile) return
          onTokenChangeRef.current(null)
          setError("No se pudo cargar la verificación de seguridad. Revisa tu conexión e inténtalo de nuevo.")
        }}
      />
      <div ref={containerRef} className="reg-turnstile-widget" />
      {error && (
        <div className="reg-turnstile-error" role="alert">
          <p>{error}</p>
          <button type="button" className="reg-edit-btn" onClick={handleRetry}>Reintentar verificación</button>
        </div>
      )}
    </div>
  )
}
