"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import {
  createCategory,
  createPrize,
  createQuestion,
  deleteCategory,
  deleteLastPrize,
  deleteQuestion,
  importQuestions,
  setCategoryActive,
  setQuestionActive,
  updateCategory,
  updateGameSettings,
  updatePrize,
  updateQuestion,
  validateCategory,
  validatePrize,
  YambolyAdminError,
} from "@/lib/yamboly-admin"
import { MAX_ROUNDS, OPTION_IDS, parseGameSettings, parseQuestionImport, validateQuestion } from "@/lib/yamboly-rules"

export type AdminFormState = { ok: true; message: string; nonce: number } | { ok: false; error: string; details?: string[] } | null

const MAX_IMPORT_BYTES = 512 * 1024

function id(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{1,9}$/.test(value)) throw new YambolyAdminError("El elemento seleccionado no es válido.")
  return Number(value)
}

function success(message: string): AdminFormState {
  revalidatePath("/dashboard/yamboly")
  return { ok: true, message, nonce: Date.now() }
}

function questionFromForm(form: FormData) {
  const parsed = validateQuestion({
    text: form.get("text"),
    options: OPTION_IDS.map(option => form.get(`option${option}`)),
    correctOptionId: form.get("correct"),
    difficulty: form.get("difficulty"),
    isTiebreaker: form.get("isTiebreaker"),
  })
  if (!parsed.ok) throw new YambolyAdminError(parsed.error)
  return parsed.value
}

async function readImport(form: FormData) {
  const file = form.get("file")
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMPORT_BYTES) throw new YambolyAdminError("El archivo supera 512 KB.")
    return file.text()
  }
  const text = form.get("csv")
  if (typeof text === "string" && text.trim()) {
    if (text.length > MAX_IMPORT_BYTES) throw new YambolyAdminError("El texto pegado supera 512 KB.")
    return text
  }
  throw new YambolyAdminError("Sube un archivo CSV o pega su contenido.")
}

export async function yambolyAdminAction(_state: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin()
  const actor = process.env.ADMIN_EMAIL || "admin"
  const intent = form.get("intent")

  try {
    switch (intent) {
      case "settings": {
        const parsed = parseGameSettings({
          readingDurationSec: form.get("readingDurationSec"),
          answeringDurationSec: form.get("answeringDurationSec"),
          pointsPerCorrect: form.get("pointsPerCorrect"),
          tieThresholdMs: form.get("tieThresholdMs"),
          maxTiebreakQuestions: form.get("maxTiebreakQuestions"),
          difficultySequence: Array.from({ length: MAX_ROUNDS }, (_, i) => form.get(`round${i}`)),
          allowLateEntry: form.get("allowLateEntry"),
        })
        if (!parsed.ok) return { ok: false, error: parsed.error }
        await updateGameSettings(parsed.value, actor)
        return success("Parámetros guardados.")
      }
      case "category-create": {
        await createCategory(validateCategory(form.get("name"), form.get("color")), actor)
        return success("Categoría creada.")
      }
      case "category-update": {
        await updateCategory(id(form.get("id")), validateCategory(form.get("name"), form.get("color")), actor)
        return success("Categoría actualizada.")
      }
      case "category-toggle": {
        const active = form.get("active") === "true"
        await setCategoryActive(id(form.get("id")), active, actor)
        return success(active ? "Categoría activada en la ruleta." : "Categoría desactivada de la ruleta.")
      }
      case "category-delete": {
        await deleteCategory(id(form.get("id")), actor)
        return success("Categoría eliminada.")
      }
      case "question-create": {
        const newId = await createQuestion(id(form.get("categoryId")), questionFromForm(form), actor)
        return success(`Pregunta #${newId} creada.`)
      }
      case "question-update": {
        await updateQuestion(id(form.get("id")), id(form.get("categoryId")), questionFromForm(form), actor)
        return success("Pregunta actualizada.")
      }
      case "question-toggle": {
        const active = form.get("active") === "true"
        await setQuestionActive(id(form.get("id")), active, actor)
        return success(active ? "Pregunta publicada." : "Pregunta oculta: no saldrá en la ruleta.")
      }
      case "question-delete": {
        await deleteQuestion(id(form.get("id")), actor)
        return success("Pregunta eliminada.")
      }
      case "import": {
        const parsed = parseQuestionImport(await readImport(form))
        if (!parsed.ok) {
          return { ok: false, error: "No se importó nada: corrige el archivo y vuelve a intentarlo.", details: parsed.errors.slice(0, 20) }
        }
        const result = await importQuestions(parsed.questions, actor)
        const parts = [`${result.inserted} pregunta${result.inserted === 1 ? " importada" : "s importadas"}`]
        if (result.skipped) parts.push(`${result.skipped} ya existían y se omitieron`)
        if (result.createdCategories.length) parts.push(`categorías nuevas: ${result.createdCategories.join(", ")}`)
        return success(`${parts.join(" · ")}.`)
      }
      case "prize-create": {
        await createPrize(prizeFromForm(form), actor)
        return success("Premio agregado.")
      }
      case "prize-update": {
        await updatePrize(id(form.get("place")), prizeFromForm(form), actor)
        return success("Premio actualizado.")
      }
      case "prize-delete-last": {
        await deleteLastPrize(actor)
        return success("Último puesto premiado eliminado.")
      }
      default:
        return { ok: false, error: "Acción no reconocida." }
    }
  } catch (error) {
    if (error instanceof YambolyAdminError) return { ok: false, error: error.message }
    console.error("Error en la administración del quiz", { intent, code: (error as { code?: string })?.code, error })
    return { ok: false, error: "No se pudo guardar el cambio. Intenta nuevamente." }
  }
}

function prizeFromForm(form: FormData) {
  return validatePrize({
    title: form.get("title"),
    description: form.get("description"),
    imageUrl: form.get("imageUrl"),
    units: form.get("units"),
    conditions: form.get("conditions"),
  })
}
