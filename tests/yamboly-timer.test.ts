import { describe, expect, it } from "vitest";
import { remainingTimeMs } from "@/lib/yamboly-timer";

describe("temporizadores manuales", () => {
  const start = "2026-11-21T12:00:00.000Z";
  const time = (seconds: number) => Date.parse(start) + seconds * 1000;

  it("no inicia sin una fecha y termina exactamente al cumplirse el plazo", () => {
    expect(remainingTimeMs(null, 8, time(0))).toBeNull();
    expect(remainingTimeMs(start, 8, time(7))).toBe(1000);
    expect(remainingTimeMs(start, 8, time(8))).toBe(0);
    expect(remainingTimeMs(start, 8, time(12))).toBe(0);
  });

  it("congela el tiempo en la pausa y mantiene vencido un plazo ya terminado", () => {
    expect(remainingTimeMs(start, 8, time(50), new Date(time(3)))).toBe(5000);
    expect(remainingTimeMs(start, 8, time(50), new Date(time(10)))).toBe(0);
  });
});
