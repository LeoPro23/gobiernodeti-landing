import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeAction = vi.hoisted(() => vi.fn());
const isAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/yamboly-db", () => ({ executeModeratorAction: executeAction }));
vi.mock("@/lib/admin-auth", () => ({ isAdmin: isAdminMock }));

import { POST } from "@/app/api/yamboly/admin/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/yamboly/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("endpoint /api/yamboly/admin", () => {
  beforeEach(() => {
    executeAction.mockReset();
    isAdminMock.mockReset();
    isAdminMock.mockResolvedValue(true);
  });

  it("rechaza si el usuario no es admin", async () => {
    isAdminMock.mockResolvedValue(false);
    const res = await POST(request({ action: "SPIN_ROULETTE" }));
    expect(res.status).toBe(403);
    expect(executeAction).not.toHaveBeenCalled();
  });

  it("acepta action como string y lo normaliza a { type: 'SPIN_ROULETTE' }", async () => {
    executeAction.mockResolvedValue({ id: "fullday", status: "ROULETTE" });
    const res = await POST(request({ action: "SPIN_ROULETTE" }));
    expect(res.status).toBe(200);
    expect(executeAction).toHaveBeenCalledWith({ type: "SPIN_ROULETTE" }, expect.any(String));
  });

  it("acepta action como objeto { type: 'SPIN_ROULETTE' }", async () => {
    executeAction.mockResolvedValue({ id: "fullday", status: "ROULETTE" });
    const res = await POST(request({ action: { type: "SPIN_ROULETTE" } }));
    expect(res.status).toBe(200);
    expect(executeAction).toHaveBeenCalledWith({ type: "SPIN_ROULETTE" }, expect.any(String));
  });

  it("falla con 400 si action no está especificado o está vacío", async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Acción no especificada.");
  });
});
