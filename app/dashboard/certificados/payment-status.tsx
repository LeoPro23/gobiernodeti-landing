import type { CertificatePaymentStatus } from "@/lib/db"

const labels: Record<CertificatePaymentStatus, string> = {
  pending: "Pendiente",
  valid: "Pago validado",
  invalid: "Rechazado",
}

export function PaymentStatus({ status }: { status: CertificatePaymentStatus }) {
  return <span className={`admin-badge admin-payment-${status}`}>{labels[status]}</span>
}
