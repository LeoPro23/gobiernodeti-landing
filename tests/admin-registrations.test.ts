import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminRegistrations, parseFilters, registrationWhere } from "@/lib/admin-registrations"

const { query, requireAdmin } = vi.hoisted(() => ({ query: vi.fn(), requireAdmin: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ getPool: () => ({ query }) }))
vi.mock("@/lib/admin-auth", () => ({ requireAdmin }))

beforeEach(() => {
  query.mockReset()
  requireAdmin.mockReset().mockResolvedValue(undefined)
})

describe("registration filters", () => {
  it("normalizes filters and ignores repeated parameters", () => {
    expect(parseFilters({ q: "  Ana  ", universidad: ["a", "b"], page: "-3" })).toEqual({ q: "Ana", universidad: "", ciudad: "", page: 1 })
    expect(parseFilters({ page: "9999999999", ciudad: " Lima " }).page).toBe(1_000_000)
    expect(parseFilters({ page: "NaN" }).page).toBe(1)
    expect(parseFilters({ q: "x".repeat(200) }).q).toHaveLength(150)
  })

  it("parameterizes user input, combines filters and escapes wildcard patterns", () => {
    const attack = "'; DROP TABLE registrations; --"
    const { sql, values } = registrationWhere(parseFilters({ q: attack, universidad: "UNT", ciudad: "Trujillo" }))
    expect(sql).not.toContain(attack)
    expect(sql).toContain("universidad = $2 AND ciudad = $3")
    expect(values).toEqual([`%${attack}%`, "UNT", "Trujillo"])
    expect(registrationWhere(parseFilters({ q: "50%_\\" })).values).toEqual(["%50\\%\\_\\\\%"])
  })

  it("does not add a WHERE clause without filters", () => {
    expect(registrationWhere(parseFilters({}))).toEqual({ sql: "", values: [] })
  })
})

describe("private dashboard data", () => {
  it("checks authorization before any database query", async () => {
    requireAdmin.mockRejectedValue(new Error("unauthorized"))
    await expect(getAdminRegistrations({})).rejects.toThrow("unauthorized")
    expect(query).not.toHaveBeenCalled()
  })

  it("clamps pagination and uses only SELECT queries", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: 26, today: 2, universities: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total: 26 }] })
      .mockResolvedValueOnce({ rows: [{ universities: ["UNT"], cities: ["Trujillo"] }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
    const result = await getAdminRegistrations({ q: "Ana", page: "999" })
    expect(result).toMatchObject({ page: 2, pages: 2, total: 26, registrations: [{ id: 1 }] })
    expect(query.mock.calls[3][1]).toEqual(["%Ana%", 25, 25])
    expect(query.mock.calls[3][0]).toContain("ORDER BY created_at DESC NULLS LAST, id DESC")
    expect(query.mock.calls.every(([sql]) => /^\s*SELECT\b/i.test(sql))).toBe(true)
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(query.mock.invocationCallOrder[0])
  })

  it("handles an empty database with one empty page", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: 0, today: 0, universities: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ universities: null, cities: null }] })
      .mockResolvedValueOnce({ rows: [] })
    const result = await getAdminRegistrations({})
    expect(result).toMatchObject({ total: 0, page: 1, pages: 1, registrations: [], options: { universities: [], cities: [] } })
  })
})
