// Cambios al registro del Fullday contra un PostgreSQL real (local). Se omite si no se define
// YAMBOLY_TEST_DATABASE_URL. Solo toca inscripciones con DNI 9000000x.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const url = process.env.YAMBOLY_TEST_DATABASE_URL
const isLocal = url ? ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname) : false
if (url && !isLocal) throw new Error("YAMBOLY_TEST_DATABASE_URL debe apuntar a localhost.")

describe.skipIf(!url)("registro de participantes contra PostgreSQL", () => {
  let changes: typeof import("@/lib/admin-registration-changes")
  let pool: import("pg").Pool

  const valid = {
    nombres: " Rosa ", apellidos: "Quispe  Díaz", dni: "90000001", universidad: "Universidad Nacional de Trujillo (UNT)",
    carrera: "Ingeniería de Sistemas", ciclo: "5.° ciclo", telefono: "", ciudad: "Trujillo, La Libertad", aceptaTerminos: true, autorizaDatos: false,
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url
    changes = await import("@/lib/admin-registration-changes")
    const db = await import("@/lib/db")
    pool = db.getPool()
    await db.ensureRegistrationTable()
    await pool.query("DELETE FROM registrations WHERE dni LIKE '9000000_'")
  })

  afterAll(async () => {
    await pool?.query("DELETE FROM registrations WHERE dni LIKE '9000000_'")
    await pool?.end()
  })

  it("valida como la inscripción web", () => {
    expect(changes.validatePanelRegistration(valid)).toMatchObject({ nombres: "Rosa", apellidos: "Quispe Díaz", telefono: "" })
    expect(() => changes.validatePanelRegistration({ ...valid, aceptaTerminos: false })).toThrow("términos")
    expect(() => changes.validatePanelRegistration({ ...valid, dni: "123" })).toThrow("DNI")
    expect(() => changes.validatePanelRegistration({ ...valid, carrera: "Medicina" })).toThrow("carrera")
  })

  it("inscribe desde el panel con asistencia y rechaza el DNI repetido", async () => {
    const created = await changes.createPanelRegistration(changes.validatePanelRegistration(valid), true)
    const row = (await pool.query("SELECT origen, asistio, asistio_at FROM registrations WHERE id = $1", [created.id])).rows[0]
    expect(row).toMatchObject({ origen: "panel", asistio: true })
    expect(row.asistio_at).not.toBeNull()
    await expect(changes.createPanelRegistration(changes.validatePanelRegistration(valid), false)).rejects.toThrow("Ya existe una inscripción con ese DNI")
  })

  it("marca y desmarca la asistencia", async () => {
    const id = (await pool.query("SELECT id FROM registrations WHERE dni = '90000001'")).rows[0].id
    await changes.setRegistrationAttendance(id, false)
    expect((await pool.query("SELECT asistio, asistio_at FROM registrations WHERE id = $1", [id])).rows[0]).toEqual({ asistio: false, asistio_at: null })
    await expect(changes.setRegistrationAttendance(999999999, true)).rejects.toThrow("ya no existe")
  })

  it("quita una inscripción, salvo si ya envió comprobantes de certificado", async () => {
    const withPayment = await changes.createPanelRegistration(changes.validatePanelRegistration({ ...valid, dni: "90000002" }), false)
    await pool.query(
      `INSERT INTO registration_payment_images (registration_id, bucket, object_key, operation_number, file_size)
       VALUES ($1, 'test', $2, '123', 10)`,
      [withPayment.id, `payment-proofs/test-${withPayment.id}.webp`]
    )
    await expect(changes.deleteRegistration(withPayment.id)).rejects.toThrow("comprobantes")

    const id = (await pool.query("SELECT id FROM registrations WHERE dni = '90000001'")).rows[0].id
    expect(await changes.deleteRegistration(id)).toBe("Rosa Quispe Díaz")
    expect((await pool.query("SELECT 1 FROM registrations WHERE id = $1", [id])).rowCount).toBe(0)
  })
})
