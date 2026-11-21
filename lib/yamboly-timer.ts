/** Tiempo restante de una etapa; una pausa congela el reloj y nunca extiende un plazo ya vencido. */
export function remainingTimeMs(start: string | Date | null, durationSeconds: number, nowMs: number, pausedAt?: string | Date | null): number | null {
  if (!start) return null;
  const startMs = new Date(start).getTime();
  const endMs = pausedAt ? new Date(pausedAt).getTime() : nowMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, durationSeconds * 1000 - Math.max(0, endMs - startMs));
}
