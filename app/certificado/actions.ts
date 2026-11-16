"use server"

import { createPaymentImageRecord, findLatestCertificatePayment, findRegistrationByDni } from "@/lib/db"
import { deleteObject, uploadWebp } from "@/lib/minio"
import { verifyTurnstileToken } from "@/lib/turnstile"

type PaymentStatus = "pending" | "valid" | "invalid"

interface CertificatePerson {
  id: number
  nombres: string
  apellidos: string
  dni: string
}

export interface CertificateLookupResult {
  success: boolean
  error?: string
  registration?: CertificatePerson
  payment?: { status: PaymentStatus }
}

export interface CertificateRequestResult {
  success: boolean
  error?: string
  data?: { status: "pending" }
}

function cleanDni(value: unknown): string | null {
  if (typeof value !== "string") return null
  const dni = value.trim()
  return /^\d{8,12}$/.test(dni) ? dni : null
}

export async function lookupCertificateRequest(dniValue: unknown, turnstileToken: unknown): Promise<CertificateLookupResult> {
  const dni = cleanDni(dniValue)
  if (!dni) return { success: false, error: "Ingresa un DNI válido de 8 a 12 dígitos." }

  const verification = await verifyTurnstileToken(turnstileToken)
  if (!verification.success) return verification

  try {
    const registration = await findRegistrationByDni(dni)
    if (!registration) return { success: false, error: "No encontramos una inscripción con ese DNI." }

    const payment = await findLatestCertificatePayment(registration.id)
    return {
      success: true,
      registration,
      payment: payment ? { status: payment.status as PaymentStatus } : undefined,
    }
  } catch (error) {
    console.error("Error consultando solicitud de certificado:", error)
    return { success: false, error: "No se pudo consultar tu inscripción. Inténtalo nuevamente." }
  }
}

export async function submitCertificateRequest(
  formData: FormData,
  turnstileToken: unknown,
): Promise<CertificateRequestResult> {
  const dniValue = formData.get("dni")
  const operationNumberValue = formData.get("operationNumber")
  const file = formData.get("voucher")
  const dni = cleanDni(dniValue)
  const operationNumber = typeof operationNumberValue === "string" ? operationNumberValue.trim() : ""

  if (!dni) return { success: false, error: "Ingresa un DNI válido de 8 a 12 dígitos." }
  if (!operationNumber || operationNumber.length > 100) return { success: false, error: "Ingresa un número de operación válido." }
  if (!(file instanceof File)) return { success: false, error: "Adjunta tu comprobante de pago en formato WebP." }

  const verification = await verifyTurnstileToken(turnstileToken)
  if (!verification.success) return verification

  let uploadedKey: string | undefined
  try {
    const registration = await findRegistrationByDni(dni)
    if (!registration) return { success: false, error: "No encontramos una inscripción con ese DNI." }

    const previousPayment = await findLatestCertificatePayment(registration.id)
    if (previousPayment?.status === "valid") return { success: false, error: "Tu solicitud de certificado ya fue validada." }
    if (previousPayment?.status === "pending") return { success: false, error: "Tu comprobante ya fue enviado y se encuentra en revisión." }

    const uploaded = await uploadWebp({ file })
    uploadedKey = uploaded.objectKey
    await createPaymentImageRecord({
      registrationId: registration.id,
      bucket: uploaded.bucket,
      objectKey: uploaded.objectKey,
      operationNumber,
      contentType: uploaded.contentType,
      fileSize: uploaded.size,
      status: "pending",
    })

    return { success: true, data: { status: "pending" } }
  } catch (error) {
    if (uploadedKey) {
      try { await deleteObject(uploadedKey) } catch (cleanupError) { console.error("Error limpiando comprobante de certificado:", cleanupError) }
    }
    console.error("Error registrando solicitud de certificado:", error)
    return { success: false, error: "No se pudo enviar el comprobante. Inténtalo nuevamente." }
  }
}
