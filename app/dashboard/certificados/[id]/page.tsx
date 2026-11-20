import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { getAdminCertificatePayment } from "@/lib/admin-certificates"
import { PaymentStatus } from "../payment-status"
import { CertificateReviewForm } from "./review-form"

export const metadata: Metadata = { title: "Revisar comprobante | Administración XII FULLDAY" }

const date = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })

export default async function CertificatePaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payment = await getAdminCertificatePayment(id)
  if (!payment) notFound()

  const voucherUrl = `/api/dashboard/certificados/${payment.id}/voucher`

  return (
    <main className="admin-container">
      <section className="admin-heading">
        <div>
          <p className="admin-eyebrow">GESTIÓN DEL EVENTO / CERTIFICADOS</p>
          <h1>Revisar comprobante</h1>
          <p className="admin-muted">{payment.nombres} {payment.apellidos}</p>
        </div>
        <Link href="/dashboard/certificados" className="admin-secondary"><ArrowLeft size={16} aria-hidden="true" /> Volver a comprobantes</Link>
      </section>

      <div className="admin-review-grid">
        <section className="admin-panel admin-review-details" aria-labelledby="payment-details-title">
          <h2 id="payment-details-title">Datos del pago</h2>
          <dl>
            <div><dt>Estado</dt><dd><PaymentStatus status={payment.status} /></dd></div>
            <div><dt>DNI</dt><dd className="admin-mono">{payment.dni}</dd></div>
            <div><dt>N.° de operación</dt><dd className="admin-mono admin-payment-operation">{payment.operation_number || "—"}</dd></div>
            <div><dt>Enviado (Perú)</dt><dd>{payment.created_at ? date.format(new Date(payment.created_at)) : "—"}</dd></div>
          </dl>
          {payment.status === "pending" && <CertificateReviewForm paymentId={payment.id} />}
        </section>

        <section className="admin-panel admin-voucher" aria-labelledby="voucher-title">
          <div className="admin-panel-heading">
            <h2 id="voucher-title">Voucher</h2>
            <a href={voucherUrl} target="_blank" rel="noreferrer" className="admin-secondary">Abrir imagen <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
          <div className="admin-voucher-preview">
            <Image src={voucherUrl} alt="Comprobante de pago enviado por el participante" width={900} height={900} unoptimized />
          </div>
        </section>
      </div>
    </main>
  )
}
