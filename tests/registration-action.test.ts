import { beforeEach, describe, expect, it, vi } from "vitest"
import { submitRegistration } from "@/app/registro/actions"
import { createRegistration, type RegistrationInput } from "@/lib/db"
import { getTurnstileSiteKey } from "@/lib/turnstile"

vi.mock("server-only", () => ({}))
// Never import the real connection pool or send test registrations to production.
vi.mock("@/lib/db", () => ({ createRegistration: vi.fn() }))

const payload: RegistrationInput = {
  nombres: "Asistente",
  apellidos: "De Prueba",
  dni: "12345678",
  universidad: "UNT",
  carrera: "Ingeniería de Sistemas",
  ciclo: "5.° ciclo",
  aceptaTerminos: true,
  autorizaDatos: false,
}
const validResponse = { success: true, action: "registro", hostname: "fullday.unitru.edu.pe" }
const fetchMock = vi.fn<typeof fetch>()
const persistMock = vi.mocked(createRegistration)

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SITE_KEY", "public-test-key")
  vi.stubEnv("TURNSTILE_SECRET_KEY", "private-test-key")
  vi.stubEnv("TURNSTILE_EXPECTED_HOSTNAME", "fullday.unitru.edu.pe")
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockReset().mockResolvedValue(Response.json(validResponse))
  persistMock.mockReset().mockResolvedValue({ id: 1, ...payload })
})

describe("registration protected by Turnstile", () => {
  it("validates the token before storing the registration and preserves the response", async () => {
    const result = await submitRegistration(payload, "valid-token")

    expect(result).toEqual({ success: true, data: { id: 1, nombres: payload.nombres, apellidos: payload.apellidos, dni: payload.dni } })
    expect(persistMock).toHaveBeenCalledExactlyOnceWith(payload)
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(persistMock.mock.invocationCallOrder[0])
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify")
    expect(options).toMatchObject({ method: "POST", cache: "no-store" })
    expect(JSON.parse(options!.body as string)).toEqual({ secret: "private-test-key", response: "valid-token" })
    expect(getTurnstileSiteKey()).toBe("public-test-key")
  })

  it.each([
    ["missing", undefined], ["null", null], ["empty", ""], ["blank", "   "],
    ["number", 123], ["object", {}], ["too long", "a".repeat(2049)],
  ])("rejects a %s token without calling Cloudflare or the database", async (_label, token) => {
    expect((await submitRegistration(payload, token as string)).success).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(persistMock).not.toHaveBeenCalled()
  })

  it.each(["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "TURNSTILE_EXPECTED_HOSTNAME"])(
    "fails closed when %s is missing", async variable => {
      vi.stubEnv(variable, "")
      expect(getTurnstileSiteKey()).toBeNull()
      expect((await submitRegistration(payload, "token")).success).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(persistMock).not.toHaveBeenCalled()
    },
  )

  it.each([
    ["invalid", { success: false, "error-codes": ["invalid-input-response"] }],
    ["expired or reused", { success: false, "error-codes": ["timeout-or-duplicate"] }],
    ["wrong hostname", { ...validResponse, hostname: "other.example.com" }],
    ["wrong action", { ...validResponse, action: "login" }],
    ["missing hostname", { success: true, action: "registro" }],
    ["missing action", { success: true, hostname: validResponse.hostname }],
    ["malformed success", { ...validResponse, success: "true" }],
    ["empty response", null],
  ])("does not access the database for an %s verification", async (_label, response) => {
    fetchMock.mockResolvedValue(Response.json(response))
    expect((await submitRegistration(payload, "token")).success).toBe(false)
    expect(persistMock).not.toHaveBeenCalled()
  })

  it("rejects a token replay when Cloudflare reports it consumed", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(validResponse))
      .mockResolvedValueOnce(Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] }))
    expect((await submitRegistration(payload, "same-token")).success).toBe(true)
    expect((await submitRegistration(payload, "same-token")).success).toBe(false)
    expect(persistMock).toHaveBeenCalledTimes(1)
  })

  it.each(["network", "http", "json"])("fails closed on a Cloudflare %s error", async failure => {
    if (failure === "network") fetchMock.mockRejectedValue(new Error("offline"))
    if (failure === "http") fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }))
    if (failure === "json") fetchMock.mockResolvedValue(new Response("invalid json"))
    expect((await submitRegistration(payload, "token")).success).toBe(false)
    expect(persistMock).not.toHaveBeenCalled()
  })

  it("bounds the verification request to ten seconds and rejects an aborted request", async () => {
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal)
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options!.signal!.addEventListener("abort", () => reject(new Error("aborted")))
    }))

    const pending = submitRegistration(payload, "token")
    controller.abort()
    expect((await pending).success).toBe(false)
    expect(timeout).toHaveBeenCalledWith(10_000)
    expect(persistMock).not.toHaveBeenCalled()
  })

  it("preserves field validation without consuming a token", async () => {
    expect((await submitRegistration({ ...payload, dni: "123" }, "token")).success).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(persistMock).not.toHaveBeenCalled()
  })

  it("keeps the duplicate-DNI response after successful verification", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    persistMock.mockRejectedValue(new Error("Ya existe un registro con este DNI."))
    expect(await submitRegistration(payload, "token")).toEqual({
      success: false, error: "Ya existe una inscripción registrada con este DNI.",
    })
  })
})
