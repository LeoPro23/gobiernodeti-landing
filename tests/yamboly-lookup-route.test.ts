import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { lookup, UserError } = vi.hoisted(() => ({ lookup: vi.fn(), UserError: class extends Error {} }));
vi.mock("@/lib/yamboly-db", () => ({ lookupYambolyDni: lookup, YambolyUserError: UserError }));
import { POST } from "@/app/api/yamboly/register/lookup/route";

const request = (dni: string) => new NextRequest("http://localhost/api/yamboly/register/lookup", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dni }),
});

describe("consulta y reingreso con DNI", () => {
  beforeEach(() => lookup.mockReset());

  it("recupera la cookie sin exponer el token en el cuerpo", async () => {
    lookup.mockResolvedValue({ recovered: true, token: "token-secreto" });
    const response = await POST(request("12345678"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recovered: true });
    expect(response.cookies.get("yamboly_token")).toMatchObject({ value: "token-secreto", httpOnly: true, sameSite: "lax", path: "/" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("mantiene el flujo de inscripción para un DNI no inscrito en el quiz", async () => {
    lookup.mockResolvedValue({ found: true, fullName: "Ana Pérez" });
    const response = await POST(request("12345678"));
    expect(await response.json()).toEqual({ found: true, fullName: "Ana Pérez" });
    expect(response.cookies.get("yamboly_token")).toBeUndefined();
  });

  it("mantiene el bloqueo para DNI nuevos si la inscripción está cerrada", async () => {
    lookup.mockImplementationOnce(async () => { throw new UserError("El registro para esta dinámica ya fue cerrado por el moderador."); });
    const response = await POST(request("12345678"));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("cerrado");
  });
});
