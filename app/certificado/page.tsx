import { connection } from "next/server"
import { getTurnstileSiteKey } from "@/lib/turnstile"
import CertificateRequestForm from "./certificate-request-form"
import "./certificado.css"

export default async function CertificadoPage() {
  await connection()

  return <CertificateRequestForm
    turnstileSiteKey={getTurnstileSiteKey()}
    paymentAccountName={process.env.CERTIFICATE_PAYMENT_ACCOUNT_NAME?.trim() || "Nombre del titular pendiente"}
    paymentQrSrc={process.env.NEXT_PUBLIC_CERTIFICATE_PAYMENT_QR_IMAGE?.trim() || null}
  />
}
