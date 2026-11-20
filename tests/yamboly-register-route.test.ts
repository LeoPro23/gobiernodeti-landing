import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const register = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yamboly-db", () => ({ registerYambolyParticipant: register }));
import { POST } from "@/app/api/yamboly/register/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/yamboly/register", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("registro de Yámboly", () => {
  beforeEach(() => register.mockReset());

  it("requiere nombre, correo y teléfono", async () => {
    const response = await POST(request({ fullName: "Ana Pérez", email: "ana@example.com" }));
    expect(response.status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });

  it("envía los tres datos y guarda el token solo en una cookie HttpOnly", async () => {
    register.mockResolvedValue({ token: "token-secreto" });
    const body = { fullName: "Ana Pérez", email: "ana@example.com", phone: "987654321" };
    const response = await POST(request(body));
    expect(register).toHaveBeenCalledWith(body);
    expect(await response.json()).toEqual({ success: true });
    expect(response.cookies.get("yamboly_token")).toMatchObject({ value: "token-secreto", httpOnly: true });
  });
});
