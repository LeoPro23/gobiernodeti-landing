import { Readable } from "node:stream"
import { isAdmin } from "@/lib/admin-auth"
import { getPool } from "@/lib/db"
import { getMinioClient } from "@/lib/minio"

export const runtime = "nodejs"
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return error("Iniciá sesión para consultar el comprobante.", 401)
  const { id } = await params
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807")) return error("Solicitud inválida.", 400)
  try {
    const result = await getPool().query<{ bucket: string; object_key: string; content_type: string }>(
      "SELECT bucket, object_key, content_type FROM registration_payment_images WHERE id = $1 LIMIT 1", [id])
    const proof = result.rows[0]
    if (!proof) return error("No encontramos el comprobante.", 404)
    if (proof.bucket !== process.env.MINIO_BUCKET?.trim() || proof.content_type !== "image/webp"
      || !/^payment-proofs\/[a-zA-Z0-9._-]+\.webp$/.test(proof.object_key)) return error("El comprobante no está disponible.", 404)
    const stream = await getMinioClient().getObject(proof.bucket, proof.object_key)
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      headers: { ...headers, "Content-Type": "image/webp", "Content-Disposition": `inline; filename="comprobante-${id}.webp"` },
    })
  } catch {
    return error("No se pudo abrir el comprobante. Intentá nuevamente.", 503)
  }
}
