import "server-only"

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const ADMIN_COOKIE = "fullday_admin"
export const SESSION_SECONDS = 60 * 60 * 8
export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
}

function config() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_SESSION_SECRET: secret } = process.env
  if (!email || !password || !secret || secret.length < 32) {
    throw new Error("Configurá ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_SESSION_SECRET (mínimo 32 caracteres).")
  }
  return { email, password, secret }
}

function equal(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest())
}

export function validAdminCredentials(email: string, password: string) {
  const expected = config()
  const emailMatches = equal(email.trim().toLowerCase(), expected.email.toLowerCase())
  const passwordMatches = equal(password, expected.password)
  return emailMatches && passwordMatches
}

function signature(payload: string) {
  const { secret, email, password } = config()
  // Rotating either credential also invalidates existing sessions.
  return createHmac("sha256", secret).update(JSON.stringify([email, password, payload])).digest("base64url")
}

export function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const payload = `${expires}.${randomBytes(24).toString("hex")}`
  return `${payload}.${signature(payload)}`
}

export function verifyAdminSession(token: string | undefined) {
  if (!token || token.length > 256) return false
  const parts = token.split(".")
  if (parts.length !== 3) return false
  const [expires, nonce, signed] = parts
  if (!/^\d+$/.test(expires) || !/^[a-f0-9]{48}$/.test(nonce)) return false
  const remaining = Number(expires) - Math.floor(Date.now() / 1000)
  if (remaining <= 0 || remaining > SESSION_SECONDS) return false
  try {
    return equal(signed, signature(`${expires}.${nonce}`))
  } catch {
    return false
  }
}

export async function isAdmin() {
  return verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login")
}
