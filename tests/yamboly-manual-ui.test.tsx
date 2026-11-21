// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import YambolyModeratorPage from "@/app/yamboly/moderador/page";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("control manual del moderador", () => {
  it("mantiene la ruleta visible y muestra la pregunta solo al pulsar el botón", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
    const state = {
      serverTime: new Date().toISOString(),
      session: { status: "ROULETTE", current_round: 1, total_rounds: 5, paused_at: null, tiebreak_round: 0, is_registration_open: false },
      settings: { readingDurationSec: 8, answeringDurationSec: 20 },
      participantsCount: 0, answeredCount: 0, playedQuestions: [], remainingPerCategory: [],
      tiebreak: { required: false, contenders: [] }, prizePlaces: 1,
    };
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => ({
      ok: true,
      json: async () => options?.method === "POST" ? { success: true } : { ...state, serverTime: new Date().toISOString() },
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<YambolyModeratorPage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(0);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Mostrar pregunta/ })); });
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(post![1]!.body as string).action.type).toBe("SHOW_QUESTION");
  });

  it("en el desempate, el botón carga la pregunta adicional", async () => {
    const state = {
      serverTime: new Date().toISOString(),
      session: { status: "TIEBREAK", current_round: 5, total_rounds: 5, paused_at: null, tiebreak_round: 0, is_registration_open: false },
      settings: { readingDurationSec: 8, answeringDurationSec: 20 },
      participantsCount: 2, answeredCount: 0, playedQuestions: [], remainingPerCategory: [],
      tiebreak: { required: false, active: true, contenders: [{ id: 1, full_name: "Ana" }, { id: 2, full_name: "Beto" }], groups: [] }, prizePlaces: 1,
    };
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => ({
      ok: true,
      json: async () => options?.method === "POST" ? { success: true } : state,
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<YambolyModeratorPage />);
    const button = await screen.findByRole("button", { name: /Lanzar Pregunta de Desempate #1/ });
    await act(async () => { fireEvent.click(button); });
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(post![1]!.body as string).action.type).toBe("START_TIEBREAK_QUESTION");
  });

  it("espera al fin de lectura y no inicia la votación por sí sola", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
    const start = new Date().toISOString();
    const state = {
      session: { status: "QUESTION_READING", current_round: 1, total_rounds: 5, paused_at: null, reading_start_time: start, tiebreak_round: 0, is_registration_open: false },
      settings: { readingDurationSec: 8, answeringDurationSec: 20 },
      participantsCount: 0, answeredCount: 0, playedQuestions: [], remainingPerCategory: [],
      tiebreak: { required: false, contenders: [] }, prizePlaces: 1,
    };
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => ({ ...state, serverTime: new Date().toISOString() }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<YambolyModeratorPage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const button = screen.getByRole("button", { name: /Iniciar votación/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(button.disabled).toBe(false);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(0);
  });
});
