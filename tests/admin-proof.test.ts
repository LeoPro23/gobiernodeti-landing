import { Readable } from "node:stream"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/admin/certificados/[id]/comprobante/route"

const { isAdmin, query, getObject } = vi.hoisted(() => ({ isAdmin: vi.fn(), query: vi.fn(), getObject: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/admin-auth", () => ({ isAdmin }))
vi.mock("@/lib/db", () => ({ getPool: () => ({ query }) }))
vi.mock("@/lib/minio", () => ({ getMinioClient: () => ({ getObject }) }))
const proof = { bucket: "test-bucket", object_key: "payment-proofs/test.webp", content_type: "image/webp" }
const read = (id = "1") => GET(new Request("http://localhost/api/admin/certificados/1/comprobante"), { params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.stubEnv("MINIO_BUCKET", "test-bucket")
  isAdmin.mockReset().mockResolvedValue(true)
  query.mockReset().mockResolvedValue({ rows: [proof] })
  getObject.mockReset().mockImplementation(async () => Readable.from([Buffer.from("test-proof")]))
})

describe("private certificate proof", () => {
  it("rejects unauthenticated requests before touching database or storage", async () => {
    isAdmin.mockResolvedValue(false)
    expect((await read()).status).toBe(401)
    expect(query).not.toHaveBeenCalled()
    expect(getObject).not.toHaveBeenCalled()
  })

  it.each(["0", "-1", "1' OR 1=1", "9223372036854775808", "NaN"])("rejects invalid id %s", async id => {
    expect((await read(id)).status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })

  it("streams authorized images with private no-store headers", async () => {
    const response = await read()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("content-type")).toBe("image/webp")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(await response.text()).toBe("test-proof")
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), ["1"])
    expect(getObject).toHaveBeenCalledWith(proof.bucket, proof.object_key)
  })

  it.each([{ ...proof, bucket: "other" }, { ...proof, object_key: "private/other.webp" }, { ...proof, content_type: "text/html" }])("does not serve arbitrary storage objects", async row => {
    query.mockResolvedValue({ rows: [row] })
    expect((await read()).status).toBe(404)
    expect(getObject).not.toHaveBeenCalled()
  })

  it("handles missing rows and storage failure without leaking internals", async () => {
    query.mockResolvedValueOnce({ rows: [] })
    expect((await read()).status).toBe(404)
    getObject.mockRejectedValue(new Error("sensitive-storage-details"))
    const response = await read()
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain("sensitive-storage-details")
  })
})
