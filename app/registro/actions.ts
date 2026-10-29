"use server"

import { createRegistration, type RegistrationInput } from "@/lib/db"

export interface RegisterResult {
  success: boolean
  error?: string
  data?: {
    id: number
    nombres: string
    apellidos: string
    dni: string
  }
}

export async function submitRegistration(payload: RegistrationInput): Promise<RegisterResult> {
  try {
    // Validaciones básicas de campos obligatorios
    if (!payload.nombres || !payload.apellidos || !payload.dni || !payload.universidad || !payload.carrera || !payload.ciclo) {
      return {
        success: false,
        error: "Por favor completa todos los campos requeridos (*).",
      }
    }

    const dniClean = payload.dni.trim()
    if (!/^\d{8,12}$/.test(dniClean)) {
      return {
        success: false,
        error: "El DNI debe contener solo números (mínimo 8 dígitos).",
      }
    }

    if (!payload.aceptaTerminos) {
      return {
        success: false,
        error: "Debes aceptar los términos y condiciones del evento para continuar.",
      }
    }

    const result = await createRegistration(payload)
    return {
      success: true,
      data: {
        id: result.id,
        nombres: result.nombres,
        apellidos: result.apellidos,
        dni: result.dni,
      },
    }
  } catch (err: unknown) {
    const error = err as Error & { code?: string }
    console.error("Error registrando asistente:", error)

    if (error.message?.includes("Ya existe un registro con este DNI")) {
      return {
        success: false,
        error: "Ya existe una inscripción registrada con este DNI.",
      }
    }

    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED" || error.message?.includes("timeout")) {
      return {
        success: false,
        error: "No se pudo conectar al servidor de base de datos (puerto 6967 bloqueado o timeout). Por favor revisa que el proxy de Cloudflare esté desactivado o que el VPS tenga abierto el puerto.",
      }
    }

    return {
      success: false,
      error: error.message || "Ocurrió un error inesperado al procesar tu registro.",
    }
  }
}
