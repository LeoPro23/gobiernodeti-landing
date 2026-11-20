"use client"

import { useActionState } from "react"
import { Check, X } from "lucide-react"
import { reviewCertificatePayment } from "../actions"

export function CertificateReviewForm({ paymentId }: { paymentId: string }) {
  const [state, action, pending] = useActionState(reviewCertificatePayment, null)

  return (
    <form action={action} className="admin-review-form" aria-busy={pending}>
      <input type="hidden" name="paymentId" value={paymentId} />
      <p className="admin-muted">Compara el voucher y su número de operación con el depósito recibido antes de validar el pago.</p>
      <div className="admin-heading-actions">
        <button className="admin-primary" type="submit" name="status" value="valid" disabled={pending}>
          <Check size={16} aria-hidden="true" /> Validar pago
        </button>
        <button className="admin-secondary admin-review-reject" type="submit" name="status" value="invalid" disabled={pending}>
          <X size={16} aria-hidden="true" /> Rechazar comprobante
        </button>
      </div>
      {pending && <p className="admin-muted" role="status">Guardando revisión…</p>}
      {state?.error && <p className="admin-error" role="alert">{state.error}</p>}
    </form>
  )
}
