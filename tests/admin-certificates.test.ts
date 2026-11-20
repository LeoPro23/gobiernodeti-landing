import { Readable } from "node:stream"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/dashboard/certificados/[id]/voucher/route"
import { reviewCertificatePayment } from "@/app/dashboard/certificados/actions"
import { getAdminCertificatePayment, listAdminCertificatePayments } from "@/lib/admin-certificates"

const { query, ensure, requireAdmin, isAdmin, readPaymentVoucher, revalidatePath } = vi.hoisted(() => ({
  query: vi.fn(), ensure: vi.fn(), requireAdmin: vi.fn(), isAdmin: vi.fn(),
  readPaymentVoucher: vi.fn(), revalidatePath: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/admin-auth", () => ({ requireAdmin, isAdmin }))
vi.mock("@/lib/db", () => ({ ensureRegistrationTable: ensure, getPool: () => ({ query }) }))
vi.mock("@/lib/minio", () => ({ readPaymentVoucher }))
vi.mock("next/cache", () => ({ revalidatePath }))

function review(id: string, status: string) {
  const form = new FormData()
  form.set("paymentId", id)
  form.set("status", status)
  return reviewCertificatePayment(null, form)
}

function voucher(id: string) {
  return GET(new Request(`https://example.test/api/dashboard/certificados/${id}/voucher`), {
    params: Promise.resolve({ id }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  requireAdmin.mockResolvedValue(undefined)
  isAdmin.mockResolvedValue(true)
})

describe("private certificate dashboard", () => {
  it("restricts listing, details, and review to authenticated admins before accessing storage", async () => {
    requireAdmin.mockRejectedValue(new Error("unauthorized"))
    await expect(listAdminCertificatePayments({})).rejects.toThrow("unauthorized")
    await expect(getAdminCertificatePayment("1")).rejects.toThrow("unauthorized")
    await expect(review("1", "valid")).rejects.toThrow("unauthorized")
    expect(ensure).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
  })

  it("combines the status and operation search while paginating accessible rows", async () => {
    const payment = { id: "26", nombres: "Ana", operation_number: "PX_50%", status: "invalid" }
    query.mockResolvedValueOnce({ rows: [{ total: 26 }] }).mockResolvedValueOnce({ rows: [payment] })

    const result = await listAdminCertificatePayments({ q: " PX_50% ", status: "invalid", page: "80" })
    expect(result).toMatchObject({ payments: [payment], page: 2, total: 26 })
    expect(query.mock.calls[1][0]).toContain("payment.operation_number ILIKE $2")
    expect(query.mock.calls[1][1]).toEqual(["invalid", "%PX\\_50\\%%", 25, 25])
  })

  it.each(["valid", "invalid"])("stores %s only for a pending voucher", async status => {
    query.mockResolvedValue({ rowCount: 1 })
    await expect(review("123", status)).resolves.toBeNull()
    expect(query.mock.calls[0][0]).toMatch(/UPDATE registration_payment_images[\s\S]+WHERE id = \$1 AND status = 'pending'/)
    expect(query.mock.calls[0][1]).toEqual(["123", status])
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/certificados/123")
  })

  it("reports a stale review or a second approved payment without overwriting the previous decision", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 })
      .mockRejectedValueOnce({ constraint: "uq_registration_valid_certificate_payment" })
    await expect(review("1", "invalid")).resolves.toMatchObject({ error: expect.stringContaining("ya fue revisado") })
    await expect(review("2", "valid")).resolves.toMatchObject({ error: expect.stringContaining("ya tiene un pago validado") })
  })

  it("rejects forged statuses and out-of-range IDs before accessing storage", async () => {
    await expect(review("1", "pending")).resolves.toHaveProperty("error")
    await expect(review("9223372036854775808", "valid")).resolves.toHaveProperty("error")
    expect(query).not.toHaveBeenCalled()
  })
})

describe("private original voucher", () => {
  it("refuses an unauthenticated request before looking up the file", async () => {
    isAdmin.mockResolvedValue(false)
    const response = await voucher("1")
    expect(response.status).toBe(401)
    expect(query).not.toHaveBeenCalled()
    expect(readPaymentVoucher).not.toHaveBeenCalled()
  })

  it("streams the original image without a public URL or cache entry", async () => {
    const bytes = Buffer.from("RIFF0000WEBP")
    query.mockResolvedValue({ rows: [{ bucket: "private", object_key: "payment-proofs/demo.webp" }] })
    readPaymentVoucher.mockResolvedValue(Readable.from([bytes]))

    const response = await voucher("7")
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(response.headers.get("Content-Type")).toBe("image/webp")
    expect(response.headers.get("Location")).toBeNull()
    expect(readPaymentVoucher).toHaveBeenCalledWith("private", "payment-proofs/demo.webp")
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes)
  })

  it("returns 404 if the stored image has gone missing", async () => {
    query.mockResolvedValue({ rows: [{ bucket: "private", object_key: "payment-proofs/demo.webp" }] })
    readPaymentVoucher.mockRejectedValue({ code: "NoSuchKey" })
    expect((await voucher("8")).status).toBe(404)
  })
})
