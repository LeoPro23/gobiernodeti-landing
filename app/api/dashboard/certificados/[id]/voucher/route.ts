import { Readable } from "node:stream"
import { isAdmin } from "@/lib/admin-auth"
import { isPaymentId } from "@/lib/admin-certificates"
import { ensureRegistrationTable, getPool } from "@/lib/db"
import { readPaymentVoucher } from "@/lib/minio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Inicia sesión para ver el comprobante.", { status: 401, headers: privateHeaders })

  const { id } = await params
  if (!isPaymentId(id)) return new Response("Comprobante no encontrado.", { status: 404, headers: privateHeaders })

  try {
    await ensureRegistrationTable()
    const { rows: [payment] } = await getPool().query<{ bucket: string; object_key: string }>(`
      SELECT bucket, object_key FROM registration_payment_images WHERE id = $1
    `, [id])
    if (!payment) return new Response("Comprobante no encontrado.", { status: 404, headers: privateHeaders })

    const voucher = await readPaymentVoucher(payment.bucket, payment.object_key)
    return new Response(Readable.toWeb(voucher) as ReadableStream<Uint8Array>, {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/webp",
        "Content-Disposition": `inline; filename="voucher-${id}.webp"`,
      },
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === "NoSuchKey" || code === "NotFound") {
      return new Response("No se encontró la imagen del comprobante.", { status: 404, headers: privateHeaders })
    }
    console.error("No se pudo abrir el voucher", { paymentId: id, code })
    return new Response("No se pudo abrir el comprobante. Intenta nuevamente.", { status: 503, headers: privateHeaders })
  }
}
