import { NextResponse } from "next/server"
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/admin-auth"

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site"
    || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 })
  }
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 })
  return response
}
