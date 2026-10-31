import "server-only"

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
const UNAVAILABLE_MESSAGE = "No se pudo verificar la seguridad de tu inscripción. Por favor, inténtalo de nuevo en unos momentos."
const INVALID_MESSAGE = "La verificación de seguridad no es válida o ha expirado. Por favor, complétala de nuevo."

function getTurnstileConfig() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim()
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim()
  const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim().toLowerCase()

  if (!siteKey || !secretKey || !expectedHostname) return null

  return { siteKey, secretKey, expectedHostname }
}

// Only the public key is sent to the client, and only when configuration is complete.
export function getTurnstileSiteKey(): string | null {
  return getTurnstileConfig()?.siteKey ?? null
}

export async function verifyTurnstileToken(token: unknown): Promise<
  { success: true } | { success: false; error: string }
> {
  const config = getTurnstileConfig()
  if (!config) return { success: false, error: UNAVAILABLE_MESSAGE }

  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    return { success: false, error: INVALID_MESSAGE }
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secretKey, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) return { success: false, error: UNAVAILABLE_MESSAGE }

    const result: unknown = await response.json()
    if (
      !result || typeof result !== "object" ||
      !("success" in result) || result.success !== true ||
      !("action" in result) || result.action !== "registro" ||
      !("hostname" in result) || typeof result.hostname !== "string" ||
      result.hostname.toLowerCase() !== config.expectedHostname
    ) {
      return { success: false, error: INVALID_MESSAGE }
    }

    return { success: true }
  } catch {
    // Do not log tokens, secret keys or Cloudflare response bodies.
    return { success: false, error: UNAVAILABLE_MESSAGE }
  }
}
