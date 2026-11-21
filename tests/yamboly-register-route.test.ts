import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { register, UserError } = vi.hoisted(() => ({ register: vi.fn(), UserError: class extends Error {} }));
vi.mock("@/lib/yamboly-db", () => ({ registerYambolyParticipant: register, YambolyUserError: UserError }));
import { POST } from "@/app/api/yamboly/register/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/yamboly/register", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("registro de Yámboly", () => {
  beforeEach(() => register.mockReset());

  it("requiere el DNI", async () => {
    const response = await POST(request({ fullName: "Ana Pérez", email: "ana@example.com" }));
    expect(response.status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });

  it("envía DNI, nombre y correo, y guarda el token solo en una cookie HttpOnly", async () => {
    register.mockResolvedValue({ token: "token-secreto" });
    const body = { dni: "12345678", fullName: "Ana Pérez", email: "ana@example.com" };
    const response = await POST(request(body));
    expect(register).toHaveBeenCalledWith(body);
    expect(await response.json()).toEqual({ success: true });
    expect(response.cookies.get("yamboly_token")).toMatchObject({ value: "token-secreto", httpOnly: true });
  });

  it("muestra los errores de validación pero oculta los internos", async () => {
    register.mockRejectedValueOnce(new UserError("Este DNI ya está inscrito en el quiz."));
    const known = await POST(request({ dni: "12345678" }));
    expect(known.status).toBe(400);
    expect((await known.json()).error).toBe("Este DNI ya está inscrito en el quiz.");

    vi.spyOn(console, "error").mockImplementation(() => {});
    register.mockRejectedValueOnce(new Error("connection refused 10.0.0.5"));
    const internal = await POST(request({ dni: "12345678" }));
    expect(internal.status).toBe(500);
    expect((await internal.json()).error).not.toContain("10.0.0.5");
  });
});
