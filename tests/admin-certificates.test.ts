import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminCertificates } from "@/lib/admin-certificates"
import { parseFilters, registrationWhere } from "@/lib/admin-registrations"

const { query, requireAdmin } = vi.hoisted(() => ({ query: vi.fn(), requireAdmin: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ getPool: () => ({ query }) }))
vi.mock("@/lib/admin-auth", () => ({ requireAdmin }))
beforeEach(() => {
  query.mockReset()
  requireAdmin.mockReset().mockResolvedValue(undefined)
})

describe("certificate request dashboard", () => {
  it("blocks all queries without authorization", async () => {
    requireAdmin.mockRejectedValue(new Error("unauthorized"))
    await expect(getAdminCertificates({})).rejects.toThrow("unauthorized")
    expect(query).not.toHaveBeenCalled()
  })

  it("searches operation numbers, uses proof dates and ignores registration-only consent filters", () => {
    const { sql, values } = registrationWhere(parseFilters({ q: "op_27", ciclo: "5.° ciclo", desde: "2026-11-01", status: "pending", autoriza_datos: "false" }), true)
    expect(sql).toContain("p.operation_number ILIKE $1")
    expect(sql).toContain("r.ciclo = $2")
    expect(sql).toContain("p.created_at AT TIME ZONE 'America/Lima'")
    expect(sql).toContain("p.status = $4")
    expect(sql).not.toContain("autoriza_datos")
    expect(values).toEqual(["%op\\_27%", "5.° ciclo", "2026-11-01", "pending"])
  })

  it("joins participant data, paginates and never exposes bucket credentials or issues certificates", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: 30, pending: 20, valid: 8, invalid: 2 }] })
      .mockResolvedValueOnce({ rows: [{ total: 26 }] })
      .mockResolvedValueOnce({ rows: [{ universities: ["UNT"], cities: [], careers: [], cycles: [] }] })
      .mockResolvedValueOnce({ rows: [{ id: "2", status: "pending" }] })
    const result = await getAdminCertificates({ status: "pending", page: "99" })
    expect(result).toMatchObject({ total: 26, page: 2, pages: 2, requests: [{ id: "2" }] })
    const [sql, values] = query.mock.calls[3]
    expect(sql).toContain("JOIN registrations r ON r.id = p.registration_id")
    expect(sql).toContain("ORDER BY p.created_at DESC NULLS LAST, p.id DESC")
    expect(sql).not.toContain("bucket")
    expect(values).toEqual(["pending", 25, 25])
    expect(query.mock.calls.every(([sql]) => /^\s*SELECT\b/i.test(sql))).toBe(true)
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(query.mock.invocationCallOrder[0])
  })

  it("handles no certificates and unknown status filters", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: 0, pending: 0, valid: 0, invalid: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [] })
    expect(await getAdminCertificates({ status: "unknown" })).toMatchObject({ total: 0, page: 1, pages: 1, requests: [], filters: { status: "" } })
  })
})
