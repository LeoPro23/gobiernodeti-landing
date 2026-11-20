"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { isPaymentId } from "@/lib/admin-certificates"
import { ensureRegistrationTable, getPool } from "@/lib/db"

export type ReviewState = { error: string } | null

export async function reviewCertificatePayment(_state: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireAdmin()

  const id = formData.get("paymentId")
  const status = formData.get("status")
  if (!isPaymentId(id) || (status !== "valid" && status !== "invalid")) {
    return { error: "La revisión del comprobante no es válida." }
  }

  try {
    await ensureRegistrationTable()
    const update = await getPool().query(`
      UPDATE registration_payment_images
      SET status = $2
      WHERE id = $1 AND status = 'pending'
    `, [id, status])

    if (!update.rowCount) {
      revalidatePath(`/dashboard/certificados/${id}`)
      return { error: "El comprobante ya fue revisado o ya no está disponible." }
    }
  } catch (error) {
    if ((error as { constraint?: string })?.constraint === "uq_registration_valid_certificate_payment") {
      return { error: "Este participante ya tiene un pago validado." }
    }
    console.error("No se pudo revisar el pago de certificado", { paymentId: id, code: (error as { code?: string })?.code })
    return { error: "No se pudo guardar la revisión. Intenta nuevamente." }
  }

  revalidatePath("/dashboard/certificados")
  revalidatePath(`/dashboard/certificados/${id}`)
  return null
}
