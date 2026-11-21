// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import YambolyParticipantPage from "@/app/yamboly/page";

vi.mock("@/app/yamboly/components/ConfettiCanvas", () => ({ ConfettiCanvas: () => null }));
vi.mock("@/app/yamboly/how-to-play", () => ({ HowToPlay: () => null }));
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

describe("reingreso del participante", () => {
  it("recupera la etapa actual, descarta el token anterior y no pide reinscribirse", async () => {
    localStorage.setItem("yamboly_token", "token-antiguo");
    let recovered = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("register/lookup")) {
        recovered = true;
        return { ok: true, json: async () => ({ recovered: true }) };
      }
      return { ok: true, json: async () => ({
        serverTime: new Date().toISOString(),
        session: { status: "WAITING_REGISTRATION", current_round: 0, total_rounds: 5, is_registration_open: false, tiebreak_round: 0 },
        participant: recovered ? { id: 1, full_name: "Ana Pérez", score: 8, correct_count: 2 } : null,
        settings: {}, prizes: [],
      }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<YambolyParticipantPage />);
    fireEvent.change(screen.getByLabelText(/DNI/), { target: { value: "12345678" } });
    fireEvent.submit(screen.getByLabelText(/DNI/).closest("form")!);
    await waitFor(() => expect(screen.getByText(/Ana Pérez/)).toBeTruthy());
    expect(localStorage.getItem("yamboly_token")).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/api/yamboly/register/lookup"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/yamboly/register")).toBe(false);
  });
});
