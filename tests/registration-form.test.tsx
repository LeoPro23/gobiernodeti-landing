// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import RegistrationForm from "@/app/registro/registration-form"
import { TurnstileWidget } from "@/app/registro/turnstile-widget"
import { submitRegistration, type RegisterResult } from "@/app/registro/actions"

vi.mock("@/app/registro/actions", () => ({ submitRegistration: vi.fn() }))
vi.mock("@/app/site-header", () => ({ SiteHeader: () => null }))
vi.mock("next/script", () => ({
  default: function MockScript({ onReady, onError, src }: { onReady?: () => void; onError?: () => void; src: string }) {
    return <>
      <button type="button" onClick={onReady} title={src}>Simular carga de Turnstile</button>
      <button type="button" onClick={onError}>Simular fallo de script</button>
    </>
  },
}))

type WidgetOptions = Parameters<NonNullable<Window["turnstile"]>["render"]>[1]
let options: WidgetOptions
const renderWidget = vi.fn((_container: HTMLElement, widgetOptions: WidgetOptions) => {
  options = widgetOptions
  return `widget-${renderWidget.mock.calls.length}`
})
const removeWidget = vi.fn()
const resetWidget = vi.fn()
const submitMock = vi.mocked(submitRegistration)

beforeEach(() => {
  vi.clearAllMocks()
  renderWidget.mockImplementation((_container, widgetOptions) => {
    options = widgetOptions
    return `widget-${renderWidget.mock.calls.length}`
  })
  submitMock.mockReset()
  window.turnstile = { render: renderWidget, remove: removeWidget, reset: resetWidget }
})

afterEach(() => {
  cleanup()
  delete window.turnstile
})

function continueToConfirmation() {
  fireEvent.change(screen.getByPlaceholderText("Ingresa tus nombres"), { target: { value: "Asistente" } })
  fireEvent.change(screen.getByPlaceholderText("Ingresa tus apellidos"), { target: { value: "De Prueba" } })
  fireEvent.change(screen.getByPlaceholderText("12345678"), { target: { value: "12345678" } })
  for (const [placeholder, choice] of [
    ["Selecciona tu universidad o institución", "Universidad Nacional de Trujillo (UNT)"],
    ["Selecciona tu carrera", "Ingeniería de Sistemas"],
    ["Selecciona tu ciclo", "5.° ciclo"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name: placeholder }))
    fireEvent.click(screen.getByRole("option", { name: choice }))
  }
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR/ }))
}

function loadWidget() {
  fireEvent.click(screen.getByRole("button", { name: "Simular carga de Turnstile" }))
}

function verify(token = "valid-token") {
  act(() => options.callback(token))
}

const confirmButton = () => screen.getByRole<HTMLButtonElement>("button", { name: /CONFIRMAR INSCRIPCIÓN/ })

describe("registration confirmation", () => {
  it("requires verification and disables confirmation again when a token expires", () => {
    render(<RegistrationForm turnstileSiteKey="public-test-key" />)
    continueToConfirmation()
    expect(confirmButton().disabled).toBe(true)
    loadWidget()
    verify()
    expect(confirmButton().disabled).toBe(false)
    act(() => options["expired-callback"]())
    expect(confirmButton().disabled).toBe(true)
    expect(screen.getByRole("alert").textContent).toContain("venció")
    verify("fresh-token")
    expect(confirmButton().disabled).toBe(false)
  })

  it("fails closed when runtime configuration is missing", () => {
    render(<RegistrationForm turnstileSiteKey={null} />)
    continueToConfirmation()
    expect(confirmButton().disabled).toBe(true)
    expect(screen.getByRole("alert").textContent).toContain("no está disponible")
    expect(submitMock).not.toHaveBeenCalled()
    expect(renderWidget).not.toHaveBeenCalled()
  })

  it("preserves data and requires a new token after returning to edit", () => {
    render(<RegistrationForm turnstileSiteKey="public-test-key" />)
    continueToConfirmation()
    loadWidget()
    verify()
    const staleCallback = options.callback
    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect((screen.getByPlaceholderText("Ingresa tus nombres") as HTMLInputElement).value).toBe("Asistente")
    expect(removeWidget).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: /CONTINUAR/ }))
    expect(confirmButton().disabled).toBe(true)
    act(() => staleCallback("stale-token"))
    expect(confirmButton().disabled).toBe(true)
    loadWidget()
    expect(renderWidget).toHaveBeenCalledTimes(2)
    verify("new-token")
    expect(confirmButton().disabled).toBe(false)
  })

  it("renews the widget after a duplicate DNI and submits only the fresh token on retry", async () => {
    submitMock.mockResolvedValueOnce({ success: false, error: "Ya existe una inscripción registrada con este DNI." })
      .mockResolvedValueOnce({ success: true, data: { id: 1, nombres: "Asistente", apellidos: "De Prueba", dni: "12345678" } })
    render(<RegistrationForm turnstileSiteKey="public-test-key" />)
    continueToConfirmation()
    loadWidget()
    verify("first-token")
    fireEvent.click(confirmButton())
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Ya existe"))
    expect(confirmButton().disabled).toBe(true)
    expect(removeWidget).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Asistente")).toBeTruthy()
    loadWidget()
    verify("second-token")
    fireEvent.click(confirmButton())
    await screen.findByText("¡Inscripción realizada con éxito!")
    expect(submitMock.mock.calls.map(call => call[1])).toEqual(["first-token", "second-token"])
  })

  it("blocks double submission and editing while the request is in flight", async () => {
    let finish!: (result: RegisterResult) => void
    submitMock.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    render(<RegistrationForm turnstileSiteKey="public-test-key" />)
    continueToConfirmation()
    loadWidget()
    verify()
    const button = confirmButton()
    act(() => { button.click(); button.click() })
    expect(submitMock).toHaveBeenCalledTimes(1)
    expect((screen.getByRole("button", { name: "Editar" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: /VOLVER/ }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => finish({ success: false, error: "Error temporal" }))
    expect(confirmButton().disabled).toBe(true)
  })

  it("requires a fresh verification after a network error without clearing the form", async () => {
    submitMock.mockRejectedValue(new Error("offline"))
    render(<RegistrationForm turnstileSiteKey="public-test-key" />)
    continueToConfirmation()
    loadWidget()
    verify()
    fireEvent.click(confirmButton())
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Error de red"))
    expect(confirmButton().disabled).toBe(true)
    expect(screen.getByText("Asistente")).toBeTruthy()
  })
})

describe("Turnstile widget lifecycle", () => {
  it("shows a recoverable error when the widget cannot initialize", async () => {
    renderWidget.mockImplementationOnce(() => { throw new Error("invalid sitekey") })
    const onTokenChange = vi.fn()
    render(<TurnstileWidget siteKey="invalid-key" onTokenChange={onTokenChange} />)
    loadWidget()
    await screen.findByRole("alert")
    expect(onTokenChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByRole("button", { name: "Reintentar verificación" })).toBeTruthy()
  })

  it("uses Spanish and the registration action, removes the instance, and ignores late callbacks", () => {
    const onTokenChange = vi.fn()
    const { unmount, rerender } = render(<TurnstileWidget siteKey="public-key" onTokenChange={onTokenChange} />)
    loadWidget()
    expect(options).toMatchObject({ action: "registro", language: "es", "refresh-expired": "auto" })
    rerender(<TurnstileWidget siteKey="public-key" onTokenChange={onTokenChange} />)
    expect(renderWidget).toHaveBeenCalledTimes(1)
    const callback = options.callback
    unmount()
    onTokenChange.mockClear()
    act(() => callback("late-token"))
    expect(onTokenChange).not.toHaveBeenCalled()
    expect(removeWidget).toHaveBeenCalledExactlyOnceWith("widget-1")
  })

  it.each(["error-callback", "timeout-callback"] as const)("invalidates the token and allows retry after %s", async callback => {
    const onTokenChange = vi.fn()
    render(<TurnstileWidget siteKey="public-key" onTokenChange={onTokenChange} />)
    loadWidget()
    act(() => options[callback]())
    expect(onTokenChange).toHaveBeenLastCalledWith(null)
    await userEvent.click(screen.getByRole("button", { name: "Reintentar verificación" }))
    expect(resetWidget).toHaveBeenCalledExactlyOnceWith("widget-1")
  })

  it("offers a script retry without reloading the form", () => {
    const onTokenChange = vi.fn()
    delete window.turnstile
    render(<TurnstileWidget siteKey="public-key" onTokenChange={onTokenChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Simular fallo de script" }))
    expect(onTokenChange).toHaveBeenLastCalledWith(null)
    fireEvent.click(screen.getByRole("button", { name: "Reintentar verificación" }))
    expect(screen.getByRole("button", { name: "Simular carga de Turnstile" }).title).toContain("retry=1")
    expect(renderWidget).not.toHaveBeenCalled()
  })
})
