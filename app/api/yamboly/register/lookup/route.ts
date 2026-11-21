import { NextRequest, NextResponse } from "next/server";
import { lookupYambolyDni, YambolyUserError } from "@/lib/yamboly-db";

export const runtime = "nodejs";

// Consultar un DNI muestra el nombre de esa inscripción, así que se limita por IP para frenar
// barridos de DNI. El límite es alto porque en el auditorio muchos celulares comparten la misma IP.
// Contador en memoria de un solo proceso, como el del login.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 100;
const attempts = new Map<string, { count: number; reset: number }>();

function limited(req: NextRequest) {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.reset <= now) attempts.delete(key);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "internal";
  const entry = attempts.get(ip) ?? { count: 0, reset: now + WINDOW_MS };
  entry.count++;
  attempts.set(ip, entry);
  return entry.count > MAX_PER_WINDOW || attempts.size > 5000;
}

export async function POST(req: NextRequest) {
  if (limited(req)) {
    return NextResponse.json({ error: "Demasiadas consultas seguidas. Espera un momento y vuelve a intentarlo." }, { status: 429 });
  }
  try {
    const body = await req.json().catch(() => null);
    const result = await lookupYambolyDni(body?.dni);
    if ("recovered" in result) {
      const response = NextResponse.json({ recovered: true }, { headers: { "Cache-Control": "no-store" } });
      response.cookies.set("yamboly_token", result.token, {
        path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax", httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof YambolyUserError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error in /api/yamboly/register/lookup:", error);
    return NextResponse.json({ error: "No se pudo consultar el DNI. Intenta nuevamente." }, { status: 500 });
  }
}
