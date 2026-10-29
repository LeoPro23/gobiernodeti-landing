import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL || "postgres://postgres:123fullgayGa@147.93.180.79:6967/fulldaydb?sslmode=disable"

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined
}

export const pool = globalThis.__dbPool ?? new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  max: 10,
})

if (process.env.NODE_ENV !== "production") {
  globalThis.__dbPool = pool
}

let tableEnsured = false

export async function ensureRegistrationTable() {
  if (tableEnsured) return
  const query = `
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      nombres VARCHAR(150) NOT NULL,
      apellidos VARCHAR(150) NOT NULL,
      dni VARCHAR(20) NOT NULL UNIQUE,
      universidad VARCHAR(200) NOT NULL,
      carrera VARCHAR(200) NOT NULL,
      ciclo VARCHAR(50) NOT NULL,
      telefono VARCHAR(30),
      ciudad VARCHAR(100),
      acepta_terminos BOOLEAN DEFAULT TRUE,
      autoriza_datos BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_registrations_dni ON registrations(dni);
  `
  await pool.query(query)
  tableEnsured = true
}

export interface RegistrationInput {
  nombres: string
  apellidos: string
  dni: string
  universidad: string
  carrera: string
  ciclo: string
  telefono?: string
  ciudad?: string
  aceptaTerminos: boolean
  autorizaDatos: boolean
}

export async function createRegistration(data: RegistrationInput) {
  await ensureRegistrationTable()

  // Verificar si ya existe con ese DNI
  const existing = await pool.query("SELECT id, dni FROM registrations WHERE dni = $1 LIMIT 1", [data.dni.trim()])
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error("Ya existe un registro con este DNI.")
  }

  const insertQuery = `
    INSERT INTO registrations (
      nombres, apellidos, dni, universidad, carrera, ciclo, telefono, ciudad, acepta_terminos, autoriza_datos
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    ) RETURNING id, nombres, apellidos, dni, created_at;
  `
  const values = [
    data.nombres.trim(),
    data.apellidos.trim(),
    data.dni.trim(),
    data.universidad.trim(),
    data.carrera.trim(),
    data.ciclo.trim(),
    data.telefono?.trim() || null,
    data.ciudad?.trim() || null,
    data.aceptaTerminos,
    data.autorizaDatos,
  ]

  const result = await pool.query(insertQuery, values)
  return result.rows[0]
}
