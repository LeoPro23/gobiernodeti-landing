"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import {
  createPanelRegistration,
  deleteRegistration,
  RegistrationChangeError,
  setRegistrationAttendance,
  validatePanelRegistration,
} from "@/lib/admin-registration-changes"
import type { AdminFormState } from "./form-state"

function id(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{1,9}$/.test(value)) throw new RegistrationChangeError("La inscripción seleccionada no es válida.")
  return Number(value)
}

function success(message: string): AdminFormState {
  revalidatePath("/dashboard")
  return { ok: true, message, nonce: Date.now() }
}

export async function registrationAdminAction(_state: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin()
  const intent = form.get("intent")
  try {
    switch (intent) {
      case "attendance": {
        const value = form.get("value") === "true"
        await setRegistrationAttendance(id(form.get("id")), value)
        return success(value ? "Asistencia marcada." : "Asistencia desmarcada.")
      }
      case "create": {
        const data = validatePanelRegistration({
          nombres: form.get("nombres"),
          apellidos: form.get("apellidos"),
          dni: form.get("dni"),
          universidad: form.get("universidad"),
          carrera: form.get("carrera"),
          ciclo: form.get("ciclo"),
          telefono: form.get("telefono"),
          ciudad: form.get("ciudad"),
          aceptaTerminos: form.get("aceptaTerminos") === "on",
          autorizaDatos: form.get("autorizaDatos") === "on",
        })
        const created = await createPanelRegistration(data, form.get("asistio") === "on")
        return success(`Inscripción #${created.id} registrada: ${created.nombres} ${created.apellidos}.`)
      }
      case "delete": {
        const name = await deleteRegistration(id(form.get("id")))
        return success(`Se quitó la inscripción de ${name}.`)
      }
      default:
        return { ok: false, error: "Acción no reconocida." }
    }
  } catch (error) {
    if (error instanceof RegistrationChangeError) return { ok: false, error: error.message }
    console.error("Error en el registro de participantes", { intent, code: (error as { code?: string })?.code, error })
    return { ok: false, error: "No se pudo guardar el cambio. Intenta nuevamente." }
  }
}
