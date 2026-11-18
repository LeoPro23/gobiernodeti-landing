import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ADMIN_COOKIE, createAdminSession, isAdmin, requireAdmin, SESSION_SECONDS, validAdminCredentials, verifyAdminSession } from "@/lib/admin-auth"
import { POST as login } from "@/app/api/login/route"
import { POST as logout } from "@/app/api/logout/route"

const { cookieGet, redirectMock } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  redirectMock: vi.fn(() => { throw new Error("REDIRECT:/login") }),
}))
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }))
vi.mock("next/navigation", () => ({ redirect: redirectMock }))

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.test")
  vi.stubEnv("ADMIN_PASSWORD", "test-password-not-real")
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-only-secret-with-more-than-32-characters")
  cookieGet.mockReset()
  redirectMock.mockClear()
})
afterEach(() => vi.useRealTimers())

describe("admin sessions", () => {
  it("validates server credentials, normalizes email and preserves password case", () => {
    expect(validAdminCredentials(" ADMIN@EXAMPLE.TEST ", "test-password-not-real")).toBe(true)
    expect(validAdminCredentials("admin@example.test", "TEST-password-not-real")).toBe(false)
    expect(validAdminCredentials("other@example.test", "test-password-not-real")).toBe(false)
  })

  it("creates unique signed tokens and rejects tampering", () => {
    const token = createAdminSession()
    expect(verifyAdminSession(token)).toBe(true)
    expect(createAdminSession()).not.toBe(token)
    expect(verifyAdminSession(`${token.slice(0, -1)}!`)).toBe(false)
    const parts = token.split(".")
    parts[0] = String(Number(parts[0]) + 1)
    expect(verifyAdminSession(parts.join("."))).toBe(false)
    expect(token).not.toContain("admin@example.test")
    expect(token).not.toContain("test-password-not-real")
  })

  it.each([undefined, "", "admin", "true", "a.b.c", "a".repeat(300)])("rejects malformed token %s", token => {
    expect(verifyAdminSession(token)).toBe(false)
  })

  it("expires sessions after eight hours", () => {
    vi.useFakeTimers()
    const token = createAdminSession()
    vi.advanceTimersByTime(SESSION_SECONDS * 1000)
    expect(verifyAdminSession(token)).toBe(false)
  })

  it("invalidates sessions when credentials or signing key change", () => {
    const token = createAdminSession()
    vi.stubEnv("ADMIN_PASSWORD", "changed-password")
    expect(verifyAdminSession(token)).toBe(false)
    vi.stubEnv("ADMIN_PASSWORD", "test-password-not-real")
    vi.stubEnv("ADMIN_SESSION_SECRET", "different-test-secret-at-least-32-characters")
    expect(verifyAdminSession(token)).toBe(false)
  })

  it("fails closed when configuration is missing", () => {
    const token = createAdminSession()
    vi.stubEnv("ADMIN_SESSION_SECRET", "")
    expect(verifyAdminSession(token)).toBe(false)
    expect(() => validAdminCredentials("admin@example.test", "test-password-not-real")).toThrow()
  })

  it("redirects visitors without a session and accepts a valid cookie", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login")
    cookieGet.mockReturnValue({ value: createAdminSession() })
    expect(await isAdmin()).toBe(true)
    await requireAdmin()
    expect(cookieGet).toHaveBeenCalledWith(ADMIN_COOKIE)
  })
})

function request(body: unknown, ip = "success-test") {
  return new Request("http://localhost/api/login", {
    method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body),
  })
}
const credentials = { email: "admin@example.test", password: "test-password-not-real" }

describe("admin endpoints", () => {
  it("sets a signed HttpOnly same-site cookie on successful login", async () => {
    const response = await login(request(credentials))
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    const cookie = response.cookies.get(ADMIN_COOKIE)
    expect(verifyAdminSession(cookie?.value)).toBe(true)
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/", maxAge: SESSION_SECONDS })
    expect(await response.json()).toEqual({ success: true })
  })

  it("rejects incorrect credentials without setting a cookie", async () => {
    const response = await login(request({ ...credentials, password: "wrong" }, "wrong-test"))
    expect(response.status).toBe(401)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it.each([null, {}, { email: [], password: "x" }, { email: "a".repeat(255), password: "x" }])("rejects invalid login payloads", async body => {
    expect((await login(request(body, "invalid-payload"))).status).toBe(400)
  })

  it("rejects malformed JSON", async () => {
    expect((await login(new Request("http://localhost/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    }))).status).toBe(400)
  })

  it("rejects form and cross-site submissions", async () => {
    expect((await login(new Request("http://localhost/api/login", { method: "POST", body: "email=x" }))).status).toBe(415)
    const crossSite = request(credentials)
    crossSite.headers.set("sec-fetch-site", "cross-site")
    expect((await login(crossSite)).status).toBe(403)
  })

  it("limits repeated failed attempts", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await login(request({ ...credentials, password: "bad" }, "throttle-test"))).status).toBe(401)
    }
    expect((await login(request(credentials, "throttle-test"))).status).toBe(429)
  })

  it("returns a safe error when server configuration is missing", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "")
    const response = await login(request(credentials, "config-test"))
    expect(response.status).toBe(503)
    expect(response.cookies.get(ADMIN_COOKIE)).toBeUndefined()
  })

  it("removes the cookie on logout and rejects cross-site logout", async () => {
    const response = await logout(request({}))
    expect(response.cookies.get(ADMIN_COOKIE)).toMatchObject({ value: "", maxAge: 0, httpOnly: true })
    const crossSite = request({})
    crossSite.headers.set("sec-fetch-site", "cross-site")
    expect((await logout(crossSite)).status).toBe(403)
  })
})
