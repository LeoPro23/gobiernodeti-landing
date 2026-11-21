import "server-only"
import { createRegistration, ensureRegistrationTable, getPool, type RegistrationInput } from "@/lib/db"
import { CARRERAS, CICLOS, CIUDADES, UNIVERSIDADES } from "@/lib/registration-options"

// Cambios al registro de participantes del Fullday desde el panel de administración.
// Quien llama debe haber verificado la sesión de administrador.

/** Error con un mensaje pensado para mostrarse tal cual en el panel. */
export class RegistrationChangeError extends Error {}

const text = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "")

/**
 * Inscripción desde el panel: solo DNI y nombres son obligatorios. Los demás campos se validan
 * si se completan; los vacíos se guardan como texto vacío (las columnas no admiten NULL).
 */
export function validatePanelRegistration(input: Record<string, unknown>): RegistrationInput {
  const data: RegistrationInput = {
    nombres: text(input.nombres),
    apellidos: text(input.apellidos),
    dni: text(input.dni),
    universidad: text(input.universidad),
    carrera: text(input.carrera),
    ciclo: text(input.ciclo),
    telefono: text(input.telefono),
    ciudad: text(input.ciudad),
    aceptaTerminos: input.aceptaTerminos === true,
    autorizaDatos: input.autorizaDatos === true,
  }
  if (!data.dni || !data.nombres) throw new RegistrationChangeError("Completa el DNI y los nombres.")
  if (!/^\d{8,12}$/.test(data.dni)) throw new RegistrationChangeError("El DNI debe tener de 8 a 12 dígitos.")
  if (data.nombres.length > 150 || data.apellidos.length > 150) throw new RegistrationChangeError("Nombres y apellidos no pueden superar 150 caracteres.")
  if (data.universidad && !UNIVERSIDADES.includes(data.universidad)) throw new RegistrationChangeError("Elige una universidad de la lista.")
  if (data.carrera && !CARRERAS.includes(data.carrera)) throw new RegistrationChangeError("Elige una carrera de la lista.")
  if (data.ciclo && !CICLOS.includes(data.ciclo)) throw new RegistrationChangeError("Elige un ciclo de la lista.")
  if (data.ciudad && !CIUDADES.includes(data.ciudad)) throw new RegistrationChangeError("Elige una ciudad de la lista.")
  if (data.telefono && !/^[+\d\s()-]{6,30}$/.test(data.telefono)) throw new RegistrationChangeError("Ingresa un teléfono válido.")
  return data
}

export async function createPanelRegistration(data: RegistrationInput, asistio: boolean) {
  try {
    return await createRegistration(data, { origen: "panel", asistio })
  } catch (error) {
    const known = error as { code?: string; message?: string }
    if (known.code === "23505" || known.message?.includes("Ya existe un registro con este DNI")) {
      throw new RegistrationChangeError("Ya existe una inscripción con ese DNI. Búscala en la lista.")
    }
    throw error
  }
}

export async function setRegistrationAttendance(id: number, asistio: boolean) {
  await ensureRegistrationTable()
  const res = await getPool().query(
    "UPDATE registrations SET asistio = $2, asistio_at = CASE WHEN $2 THEN NOW() END WHERE id = $1",
    [id, asistio]
  )
  if (!res.rowCount) throw new RegistrationChangeError("Esa inscripción ya no existe.")
}

/**
 * Quita una inscripción errónea. Si ya envió comprobantes de certificado no se permite,
 * porque borrarla eliminaría también esos comprobantes.
 */
export async function deleteRegistration(id: number) {
  await ensureRegistrationTable()
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const row = (await client.query("SELECT id, nombres, apellidos FROM registrations WHERE id = $1 FOR UPDATE", [id])).rows[0]
    if (!row) throw new RegistrationChangeError("Esa inscripción ya no existe.")
    const payments = await client.query("SELECT 1 FROM registration_payment_images WHERE registration_id = $1 LIMIT 1", [id])
    if (payments.rowCount) {
      throw new RegistrationChangeError("Esta persona ya envió comprobantes de certificado: no se puede quitar su inscripción.")
    }
    await client.query("DELETE FROM registrations WHERE id = $1", [id])
    await client.query("COMMIT")
    return [row.nombres, row.apellidos].filter(Boolean).join(" ")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
