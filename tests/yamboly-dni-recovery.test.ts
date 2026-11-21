import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const client = { query: vi.fn(), release: vi.fn() };
  return { client, pool: { query: vi.fn(), connect: vi.fn(async () => client) }, ensureRegistrationTable: vi.fn(async () => {}) };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getPool: () => mocks.pool, ensureRegistrationTable: mocks.ensureRegistrationTable }));
import { lookupYambolyDni } from "@/lib/yamboly-db";

describe("recuperación de participación mediante DNI", () => {
  beforeEach(() => {
    mocks.pool.query.mockReset().mockImplementation(async (sql: string) =>
      sql.includes("COUNT(*)") ? { rows: [{ count: "1" }], rowCount: 1 } : { rows: [], rowCount: 0 }
    );
    mocks.client.query.mockReset();
    mocks.client.release.mockClear();
  });

  it.each(["ROULETTE", "QUESTION_ANSWERING", "TIEBREAK", "PODIUM"])("recupera a un inscrito en etapa %s sin modificar sus datos", async (status) => {
    mocks.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM yamboly_sessions")) return { rows: [{ status, is_registration_open: false, allow_late_entry: false, tiebreak_round: status === "TIEBREAK" ? 1 : 0 }] };
      if (sql.includes("SELECT token FROM yamboly_participants")) return { rows: [{ token: "token-actual" }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    expect(await lookupYambolyDni("12345678")).toEqual({ recovered: true, token: "token-actual" });
    expect(mocks.client.query.mock.calls.some(([sql]) => /^\s*(UPDATE|INSERT|DELETE)\b/.test(sql as string))).toBe(false);
    expect(mocks.client.query).toHaveBeenCalledWith("COMMIT");
    expect(mocks.client.release).toHaveBeenCalled();
  });

  it("rechaza un DNI que no participa en el quiz cuando el registro está cerrado", async () => {
    mocks.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM yamboly_sessions")) return { rows: [{ status: "QUESTION_READING", is_registration_open: false, allow_late_entry: false, tiebreak_round: 0 }] };
      return { rows: [], rowCount: 0 };
    });
    await expect(lookupYambolyDni("87654321")).rejects.toThrow("cerrado");
    expect(mocks.client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.client.query.mock.calls.some(([sql]) => (sql as string).includes("FROM registrations"))).toBe(false);
  });

  it("consulta el registro del Fullday para un DNI nuevo cuando el registro está abierto", async () => {
    mocks.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM yamboly_sessions")) return { rows: [{ status: "WAITING_REGISTRATION", is_registration_open: true, tiebreak_round: 0 }] };
      if (sql.includes("FROM registrations")) return { rows: [{ id: 1, full_name: "Ana Pérez" }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    expect(await lookupYambolyDni("87654321")).toEqual({ found: true, fullName: "Ana Pérez" });
  });
});
