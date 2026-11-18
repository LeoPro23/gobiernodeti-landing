import { beforeEach, describe, expect, it, vi } from "vitest"

const { construct } = vi.hoisted(() => ({ construct: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("pg", () => ({ Pool: class { constructor(options: unknown) { construct(options) } } }))

beforeEach(() => {
  vi.resetModules()
  construct.mockClear()
  globalThis.__dbPool = undefined
})

describe("server database configuration", () => {
  it("can import without build-time secrets and fails explicitly only when connecting", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const { getPool } = await import("@/lib/db")
    expect(construct).not.toHaveBeenCalled()
    expect(() => getPool()).toThrow("DATABASE_URL")
  })

  it("uses only the environment URL and reuses its pool", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://unused-test-placeholder")
    const { getPool } = await import("@/lib/db")
    expect(getPool()).toBe(getPool())
    expect(construct).toHaveBeenCalledExactlyOnceWith({ connectionString: "postgres://unused-test-placeholder", connectionTimeoutMillis: 5000, max: 10 })
  })
})
