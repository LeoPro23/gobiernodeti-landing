import { connection } from "next/server"
import { getTurnstileSiteKey } from "@/lib/turnstile"
import RegistrationForm from "./registration-form"
import "./registro.css"

export default async function RegistroPage() {
  await connection()

  return <RegistrationForm turnstileSiteKey={getTurnstileSiteKey()} />
}
