import { beforeEach, describe, expect, it, vi } from "vitest"
import { activeFilterEntries, adminPageUrl, getAdminRegistrations, getFilterOptions, parseFilters, registrationWhere } from "@/lib/admin-registrations"

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
    expect(parseFilters({ q: "  Ana  ", universidad: ["a", "b"], page: "-3" })).toMatchObject({ q: "Ana", universidad: "", ciudad: "", page: 1, ciclo: "", carrera: "" })
    expect(parseFilters({ page: "9999999999", ciudad: " Lima " }).page).toBe(1_000_000)
    expect(parseFilters({ page: "NaN" }).page).toBe(1)
    expect(parseFilters({ q: "x".repeat(200) }).q).toHaveLength(150)
  })

  it("parameterizes user input, combines filters and escapes wildcard patterns", () => {
    const attack = "'; DROP TABLE registrations; --"
    const { sql, values } = registrationWhere(parseFilters({ q: attack, universidad: "UNT", ciudad: "Trujillo" }))
    expect(sql).not.toContain(attack)
    expect(sql).toContain("r.universidad = $2 AND r.ciudad = $3")
    expect(values).toEqual([`%${attack}%`, "UNT", "Trujillo"])
    expect(registrationWhere(parseFilters({ q: "50%_\\" })).values).toEqual(["%50\\%\\_\\\\%"])
  })

  it("does not add a WHERE clause without filters", () => {
    expect(registrationWhere(parseFilters({}))).toEqual({ sql: "", values: [] })
  })

  it("combines academic filters, consent and inclusive Peru dates using parameters", () => {
    const filters = parseFilters({ ciclo: "8.° ciclo", carrera: "Sistemas", desde: "2026-11-01", hasta: "2026-11-20", autoriza_datos: "false", acepta_terminos: "true" })
    const { sql, values } = registrationWhere(filters)
    expect(values).toEqual(["Sistemas", "8.° ciclo", "2026-11-01", "2026-11-20", "true", "false"])
    expect(sql).toContain("r.ciclo = $2")
    expect(sql).toContain("(r.created_at AT TIME ZONE 'America/Lima')::date <= $4::date")
    expect(sql).toContain("r.autoriza_datos = $6::boolean")
  })

  it("validates real dates, swaps reversed date ranges and rejects enum injections", () => {
    expect(parseFilters({ desde: "2026-02-30", hasta: "bad", status: "valid' OR true", autoriza_datos: "no" })).toMatchObject({ desde: "", hasta: "", status: "", autoriza_datos: "" })
    expect(parseFilters({ desde: "2026-11-20", hasta: "2026-11-01" })).toMatchObject({ desde: "2026-11-01", hasta: "2026-11-20" })
    expect(parseFilters({ desde: "2024-02-29", hasta: "0000-01-01" })).toMatchObject({ desde: "2024-02-29", hasta: "" })
    expect(parseFilters({ ciclo: ["1", "2"], status: ["pending", "valid"] })).toMatchObject({ ciclo: "", status: "" })
  })

  it("preserves all applicable filters in pagination but removes unrelated tab filters", () => {
    const filters = parseFilters({ q: "Ana & José", universidad: "UNT", ciclo: "10.° ciclo", carrera: "Sistemas", ciudad: "Trujillo", desde: "2026-11-01", hasta: "2026-11-20", autoriza_datos: "false", status: "pending" })
    const url = new URL(adminPageUrl("/dashboard", filters, 3), "http://localhost")
    expect(url.searchParams.get("ciclo")).toBe("10.° ciclo")
    expect(url.searchParams.get("autoriza_datos")).toBe("false")
    expect(url.searchParams.get("status")).toBeNull()
    expect(url.searchParams.get("page")).toBe("3")
    const certificates = new URL(adminPageUrl("/dashboard/certificados", filters, 2), "http://localhost")
    expect(certificates.searchParams.get("status")).toBe("pending")
    expect(certificates.searchParams.get("autoriza_datos")).toBeNull()
    expect(activeFilterEntries(parseFilters({ status: "pending" }))).toEqual([])
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
    expect(result).toMatchObject({ total: 0, page: 1, pages: 1, registrations: [], options: { universities: [], cities: [], careers: [], cycles: [] } })
  })

  it("naturally sorts cycles from real data", async () => {
    query.mockResolvedValue({ rows: [{ universities: null, cities: null, careers: ["Sistemas"], cycles: ["10.° ciclo", "2.° ciclo", "1.° ciclo"] }] })
    const result = await getFilterOptions()
    expect(result.cycles).toEqual(["1.° ciclo", "2.° ciclo", "10.° ciclo"])
  })
})
