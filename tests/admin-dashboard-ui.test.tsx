// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { DashboardFilters, DashboardPagination, DashboardTabs } from "@/app/dashboard/dashboard-ui"
import { parseFilters } from "@/lib/admin-registrations"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ getPool: vi.fn() }))
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn() }))
afterEach(cleanup)
const options = { universities: ["UNT"], cities: ["Trujillo"], careers: ["Sistemas"], cycles: ["1.° ciclo", "10.° ciclo"] }

describe("dashboard controls", () => {
  it("marks the active section using accessible navigation links", () => {
    render(<DashboardTabs certificates />)
    expect(screen.getByRole("link", { name: "Certificados" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: "Inscritos" }).hasAttribute("aria-current")).toBe(false)
  })

  it("renders selected cycle, academic and consent filters and keeps reset on the current tab", () => {
    render(<DashboardFilters filters={parseFilters({ ciclo: "10.° ciclo", autoriza_datos: "false" })} options={options} />)
    expect((screen.getByLabelText("Ciclo") as HTMLSelectElement).value).toBe("10.° ciclo")
    expect((screen.getByLabelText("Autorización de datos") as HTMLSelectElement).value).toBe("false")
    expect(screen.getByLabelText("Carrera")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Limpiar filtros" }).getAttribute("href")).toBe("/dashboard")
  })

  it("shows proof statuses instead of consent filters and opens active date controls", () => {
    render(<DashboardFilters filters={parseFilters({ status: "pending", desde: "2026-11-01" })} options={options} certificates />)
    expect((screen.getByLabelText("Estado del comprobante") as HTMLSelectElement).value).toBe("pending")
    expect(screen.queryByLabelText("Autorización de datos")).toBeNull()
    expect(screen.getByLabelText("Desde").closest("details")?.open).toBe(true)
    expect(screen.getByRole("link", { name: "Limpiar filtros" }).getAttribute("href")).toBe("/dashboard/certificados")
  })

  it("keeps unknown selected option visible rather than silently displaying all options", () => {
    render(<DashboardFilters filters={parseFilters({ ciclo: "Otro ciclo" })} options={options} />)
    expect((screen.getByLabelText("Ciclo") as HTMLSelectElement).value).toBe("Otro ciclo")
  })

  it("preserves academic, date and status filters across certificate pages", () => {
    render(<DashboardPagination path="/dashboard/certificados" filters={parseFilters({ ciclo: "10.° ciclo", status: "pending", desde: "2026-11-01" })} total={30} page={1} pages={2} noun="comprobantes" />)
    const href = screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")!
    const params = new URL(href, "http://localhost").searchParams
    expect(params.get("ciclo")).toBe("10.° ciclo")
    expect(params.get("status")).toBe("pending")
    expect(params.get("desde")).toBe("2026-11-01")
    expect(params.get("page")).toBe("2")
    expect(screen.getByText("1–25 de 30 comprobantes")).toBeTruthy()
  })
})
