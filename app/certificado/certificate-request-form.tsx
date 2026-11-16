"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle2, FileImage, IdCard, Search, Upload, WalletCards } from "lucide-react"
import { SiteHeader } from "../site-header"
import { TurnstileWidget } from "../registro/turnstile-widget"
import { lookupCertificateRequest, submitCertificateRequest, type CertificateLookupResult } from "./actions"

type ViewState = "lookup" | "request" | "not-found" | "pending" | "valid" | "invalid" | "sent"

export default function CertificateRequestForm({
  turnstileSiteKey,
  paymentAccountName,
  paymentQrSrc,
}: {
  turnstileSiteKey: string | null
  paymentAccountName: string
  paymentQrSrc: string | null
}) {
  const [dni, setDni] = useState("")
  const [operationNumber, setOperationNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [view, setView] = useState<ViewState>("lookup")
  const [message, setMessage] = useState<string | null>(null)
  const [personName, setPersonName] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [widgetVersion, setWidgetVersion] = useState(0)
  const [loading, setLoading] = useState(false)

  const renewTurnstile = () => {
    setToken(null)
    setWidgetVersion(version => version + 1)
  }

  const applyLookupResult = (result: CertificateLookupResult) => {
    setPersonName(result.registration ? `${result.registration.nombres} ${result.registration.apellidos}` : null)
    setView(result.payment ? result.payment.status : "request")
  }

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d{8,12}$/.test(dni.trim())) return setMessage("Ingresa un DNI válido de 8 a 12 dígitos.")
    if (!turnstileSiteKey || !token) return setMessage("Completa la verificación de seguridad para consultar.")

    setLoading(true)
    setMessage(null)
    try {
      const result = await lookupCertificateRequest(dni, token)
      renewTurnstile()
      if (!result.success) {
        setView(result.error?.includes("No encontramos") ? "not-found" : "lookup")
        setMessage(result.error || "No se pudo consultar la inscripción.")
        return
      }
      applyLookupResult(result)
    } catch {
      renewTurnstile()
      setMessage("No se pudo consultar la inscripción. Inténtalo nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return
    if (selectedFile.type !== "image/webp" || !selectedFile.name.toLowerCase().endsWith(".webp")) {
      setFile(null)
      setMessage("El comprobante debe ser una imagen WebP.")
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null)
      setMessage("El comprobante no puede superar los 10 MB.")
      return
    }
    setFile(selectedFile)
    setMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return setMessage("Adjunta tu comprobante de pago.")
    if (!operationNumber.trim()) return setMessage("Ingresa el número de operación.")
    if (!turnstileSiteKey || !token) return setMessage("Completa la verificación de seguridad para enviar.")

    setLoading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.set("dni", dni)
      formData.set("operationNumber", operationNumber)
      formData.set("voucher", file)
      const result = await submitCertificateRequest(formData, token)
      renewTurnstile()
      if (!result.success) {
        setMessage(result.error || "No se pudo enviar el comprobante.")
        return
      }
      setView("sent")
      setFile(null)
      setOperationNumber("")
    } catch {
      renewTurnstile()
      setMessage("No se pudo enviar el comprobante. Inténtalo nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const statusContent: Record<"pending" | "valid" | "invalid", { title: string; body: string }> = {
    pending: { title: "Comprobante en revisión", body: "Ya recibimos tu solicitud. Te mostraremos el resultado cuando termine la verificación." },
    valid: { title: "Solicitud validada", body: "Tu pago fue validado. Conserva este mensaje para coordinar la entrega de tu certificado." },
    invalid: { title: "Comprobante no validado", body: "El comprobante anterior no pudo validarse. Puedes enviar uno nuevo revisando que los datos sean legibles." },
  }

  return <>
    <SiteHeader page="certificate" />
    <main className="certificate-page">
      <div className="certificate-shell">
        <section className="certificate-intro">
          <span className="certificate-eyebrow"><WalletCards size={14} /> CERTIFICADO DE PARTICIPACIÓN</span>
          <h1>Solicita tu certificado</h1>
          <p>Identifica tu inscripción, realiza el pago de <strong>S/ 20</strong> y envía tu comprobante para revisión.</p>
          <div className="certificate-note"><CheckCircle2 size={18} /><span>La entrada al evento es gratuita. El certificado es opcional.</span></div>
        </section>

        <section className="certificate-card">
          {(view === "lookup" || view === "not-found") && <form onSubmit={handleLookup}>
            <div className="certificate-card-head"><IdCard size={24} /><div><h2>Busca tu inscripción</h2><p>Ingresa el DNI utilizado durante el registro al evento.</p></div></div>
            <label className="certificate-field"><span>DNI</span><div className="certificate-input-wrap"><IdCard size={17} /><input value={dni} onChange={event => { setDni(event.target.value.replace(/\D/g, "")); setMessage(null) }} inputMode="numeric" maxLength={12} placeholder="Ej. 12345678" /></div></label>
            {turnstileSiteKey ? <TurnstileWidget key={widgetVersion} siteKey={turnstileSiteKey} onTokenChange={setToken} /> : <div className="certificate-alert">La verificación de seguridad no está disponible.</div>}
            {message && <div className="certificate-alert" role="alert">{message}</div>}
            <button className="certificate-button" type="submit" disabled={loading || !turnstileSiteKey || !token}><Search size={17} /> {loading ? "CONSULTANDO..." : "CONSULTAR INSCRIPCIÓN"}</button>
          </form>}

          {(view === "request" || view === "invalid") && <form onSubmit={handleSubmit}>
            <div className="certificate-card-head"><Upload size={24} /><div><h2>{view === "invalid" ? "Envía un nuevo comprobante" : "Completa tu solicitud"}</h2><p>{personName ? `Inscripción encontrada para ${personName}.` : "Adjunta el comprobante de tu pago."}</p></div></div>
            {view === "invalid" && <div className="certificate-status certificate-status--invalid"><strong>{statusContent.invalid.title}</strong><span>{statusContent.invalid.body}</span></div>}
            <PaymentInstructions paymentAccountName={paymentAccountName} paymentQrSrc={paymentQrSrc} />
            <label className="certificate-field"><span>Número de operación</span><input value={operationNumber} onChange={event => setOperationNumber(event.target.value)} maxLength={100} placeholder="Ingresa el número de operación" /></label>
            <label className="certificate-upload"><FileImage size={25} /><strong>{file ? file.name : "Adjunta tu comprobante .webp"}</strong><small>Solo imágenes WebP de hasta 10 MB</small><input type="file" accept=".webp,image/webp" onChange={event => handleFile(event.target.files?.[0])} /></label>
            {turnstileSiteKey ? <TurnstileWidget key={widgetVersion} siteKey={turnstileSiteKey} onTokenChange={setToken} /> : <div className="certificate-alert">La verificación de seguridad no está disponible.</div>}
            {message && <div className="certificate-alert" role="alert">{message}</div>}
            <button className="certificate-button" type="submit" disabled={loading || !turnstileSiteKey || !token}><Upload size={17} /> {loading ? "ENVIANDO..." : "ENVIAR COMPROBANTE"}</button>
          </form>}

          {view === "sent" && <StatusMessage title="Comprobante enviado" body="Tu comprobante se verificará. Recibirás el resultado cuando finalice la revisión." />}
          {(view === "pending" || view === "valid") && <StatusMessage title={statusContent[view].title} body={statusContent[view].body} />}
          {view === "not-found" && <Link className="certificate-link" href="/registro">Ir al formulario de inscripción <ArrowRight size={15} /></Link>}
          {(view === "pending" || view === "valid") && <Link className="certificate-link" href="/">Volver al inicio <ArrowRight size={15} /></Link>}
        </section>
      </div>
    </main>
  </>
}

function PaymentInstructions({ paymentAccountName, paymentQrSrc }: { paymentAccountName: string; paymentQrSrc: string | null }) {
  return <div className="certificate-payment">
    <div className="certificate-qr" aria-label="QR de pago">
      {paymentQrSrc ? <Image src={paymentQrSrc} alt="Código QR para realizar el pago" fill sizes="180px" /> : <><WalletCards size={38} /><span>QR pendiente de configurar</span></>}
    </div>
    <div><strong>Escanea para pagar S/ 20</strong><small>Realiza el pago a nombre de {paymentAccountName}.</small></div>
  </div>
}

function StatusMessage({ title, body }: { title: string; body: string }) {
  return <div className="certificate-status certificate-status--success"><CheckCircle2 size={40} /><h2>{title}</h2><p>{body}</p></div>
}
