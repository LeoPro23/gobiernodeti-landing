import { NextResponse } from "next/server"
import { ADMIN_COOKIE, adminCookieOptions, createAdminSession, SESSION_SECONDS, validAdminCredentials } from "@/lib/admin-auth"

export const runtime = "nodejs"

// Single-process throttle for this internal project. For multiple instances,
// use shared storage and configure the proxy to overwrite x-forwarded-for.
const attempts = new Map<string, { count: number; reset: number }>()

function json(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return json({ error: "Formato de solicitud no permitido." }, 415)
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Solicitud no permitida." }, 403)
  }
  const now = Date.now()
  for (const [key, entry] of attempts) if (entry.reset <= now) attempts.delete(key)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "internal"
  const entry = attempts.get(ip) ?? { count: 0, reset: now + 15 * 60_000 }
  if (entry.count >= 10 || (!attempts.has(ip) && attempts.size >= 1000)) {
    return json({ error: "Demasiados intentos. Volvé a intentar en 15 minutos." }, 429)
  }
  entry.count++
  attempts.set(ip, entry)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Solicitud inválida." }, 400)
  }
  if (!body || typeof body !== "object" || !("email" in body) || !("password" in body)
    || typeof body.email !== "string" || typeof body.password !== "string"
    || body.email.length > 254 || body.password.length > 256) {
    return json({ error: "Ingresá tu correo y contraseña." }, 400)
  }

  try {
    if (!validAdminCredentials(body.email, body.password)) {
      return json({ error: "Correo o contraseña incorrectos." }, 401)
    }
    const response = json({ success: true }, 200)
    response.cookies.set(ADMIN_COOKIE, createAdminSession(), { ...adminCookieOptions, maxAge: SESSION_SECONDS })
    attempts.delete(ip)
    return response
  } catch {
    return json({ error: "El acceso no está configurado. Revisá las variables de entorno del servidor." }, 503)
  }
}
