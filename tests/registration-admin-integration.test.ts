// Cambios al registro del Fullday contra un PostgreSQL real (local). Se omite si no se define
// YAMBOLY_TEST_DATABASE_URL. Solo toca inscripciones con DNI 9000000x.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }))

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

  it("solo exige DNI y nombres; valida los demás campos si se completan", () => {
    expect(changes.validatePanelRegistration(valid)).toMatchObject({ nombres: "Rosa", apellidos: "Quispe Díaz", telefono: "" })
    expect(changes.validatePanelRegistration({ dni: "90000003", nombres: "Solo Nombre" })).toMatchObject({
      apellidos: "", universidad: "", carrera: "", ciclo: "", ciudad: "", aceptaTerminos: false, autorizaDatos: false,
    })
    expect(() => changes.validatePanelRegistration({ ...valid, nombres: "" })).toThrow("DNI y los nombres")
    expect(() => changes.validatePanelRegistration({ ...valid, dni: "123" })).toThrow("DNI")
    expect(() => changes.validatePanelRegistration({ ...valid, carrera: "Medicina" })).toThrow("carrera")
  })

  it("guarda una inscripción mínima y el quiz la reconoce sin apellidos", async () => {
    const created = await changes.createPanelRegistration(changes.validatePanelRegistration({ dni: "90000003", nombres: "Solo Nombre" }), false)
    const row = (await pool.query("SELECT apellidos, universidad, acepta_terminos, origen FROM registrations WHERE id = $1", [created.id])).rows[0]
    expect(row).toEqual({ apellidos: "", universidad: "", acepta_terminos: false, origen: "panel" })
    const name = (await pool.query("SELECT concat_ws(' ', trim(nombres), NULLIF(trim(apellidos), '')) AS n FROM registrations WHERE id = $1", [created.id])).rows[0].n
    expect(name).toBe("Solo Nombre")
  })

  it("inscribe desde el panel con asistencia y rechaza el DNI repetido", async () => {
    const created = await changes.createPanelRegistration(changes.validatePanelRegistration(valid), true)
    const row = (await pool.query("SELECT origen, asistio, asistio_at FROM registrations WHERE id = $1", [created.id])).rows[0]
    expect(row).toMatchObject({ origen: "panel", asistio: true })
    expect(row.asistio_at).not.toBeNull()
    await expect(changes.createPanelRegistration(changes.validatePanelRegistration(valid), false)).rejects.toThrow("Ya existe una inscripción con ese DNI")
  })

  it("edita una inscripción, conserva valores antiguos y no repite DNI", async () => {
    const id = (await pool.query("SELECT id FROM registrations WHERE dni = '90000001'")).rows[0].id
    // Un valor que ya no está en las listas (inscripción antigua) se puede conservar al editar.
    await pool.query("UPDATE registrations SET carrera = 'Carrera antigua' WHERE id = $1", [id])
    const updated = await changes.updateRegistration(id, { ...valid, nombres: "Rosa María", carrera: "Carrera antigua", telefono: "987654321", autorizaDatos: true })
    expect(updated.nombres).toBe("Rosa María")
    const row = (await pool.query("SELECT nombres, carrera, telefono, autoriza_datos FROM registrations WHERE id = $1", [id])).rows[0]
    expect(row).toEqual({ nombres: "Rosa María", carrera: "Carrera antigua", telefono: "987654321", autoriza_datos: true })
    // Pero no se puede poner un valor nuevo que no esté en la lista.
    await expect(changes.updateRegistration(id, { ...valid, carrera: "Medicina" })).rejects.toThrow("carrera")
    // Ni usar el DNI de otra inscripción.
    await pool.query("DELETE FROM registrations WHERE dni = '90000009'")
    await changes.createPanelRegistration(changes.validatePanelRegistration({ ...valid, dni: "90000009" }), false)
    await expect(changes.updateRegistration(id, { ...valid, dni: "90000009" })).rejects.toThrow("otra inscripción con ese DNI")
    await expect(changes.updateRegistration(999999999, valid)).rejects.toThrow("ya no existe")
    await pool.query("DELETE FROM registrations WHERE dni = '90000009'")
  })

  it("exporta según reglas de incluir y excluir (p. ej. sin 10.° ciclo de la UNT)", async () => {
    const { getAttendees, countAttendees } = await import("@/lib/admin-registrations")
    const { DEFAULT_EXPORT_FILTER } = await import("@/lib/export-rules")
    await pool.query("DELETE FROM registrations WHERE dni LIKE '9100000_'")
    const rows: [string, string, string, string, boolean][] = [
      ["91000001", "Ana", "Universidad Nacional de Trujillo (UNT)", "10.° ciclo", true], // excluida por la regla
      ["91000003", "Caro", "Universidad Nacional de Trujillo (UNT)", "1.° ciclo", true], // entra: 1.° no es 10.°
      ["91000004", "Dani", "Universidad Privada Antenor Orrego (UPAO)", "10.° ciclo", true], // entra: otra universidad
      ["91000005", "Elsa", "Universidad Nacional de Trujillo (UNT)", "9.° ciclo", true], // entra (y no tiene ciudad)
      ["91000006", "Fito", "Universidad Nacional de Trujillo (UNT)", "8.° ciclo", false], // sin asistencia
    ]
    for (const [dni, nombres, universidad, ciclo, asistio] of rows) {
      await pool.query("INSERT INTO registrations (nombres, apellidos, dni, universidad, carrera, ciclo, asistio) VALUES ($1, 'Prueba', $2, $3, 'Sistemas', $4, $5)", [nombres, dni, universidad, ciclo, asistio])
    }
    const names = async (filter: Parameters<typeof getAttendees>[0]) => (await getAttendees(filter)).map(a => a.full_name).filter(n => n.endsWith("Prueba"))
    // Regla por defecto: solo asistentes, sin 10.° ciclo de la UNT. Elsa no tiene ciudad y aun así entra.
    expect(await names(DEFAULT_EXPORT_FILTER)).toEqual(["Caro Prueba", "Dani Prueba", "Elsa Prueba"])
    // Sin reglas: todos los asistentes.
    expect(await names({ onlyAttended: true, rules: [] })).toEqual(["Ana Prueba", "Caro Prueba", "Dani Prueba", "Elsa Prueba"])
    // Incluir solo la UPAO.
    expect(await names({ onlyAttended: true, rules: [{ mode: "include", universidad: "Universidad Privada Antenor Orrego (UPAO)" }] })).toEqual(["Dani Prueba"])
    // Excluir por ciudad no saca a quien no tiene ciudad registrada.
    expect(await names({ onlyAttended: true, rules: [{ mode: "exclude", ciudad: "Lima, Lima" }] })).toContain("Elsa Prueba")
    // Sin el filtro de asistencia también sale quien no la tiene.
    expect(await names({ onlyAttended: false, rules: [] })).toContain("Fito Prueba")
    expect(await countAttendees({ onlyAttended: true, rules: [{ mode: "include", universidad: "Universidad Privada Antenor Orrego (UPAO)" }] }))
      .toBe((await pool.query("SELECT count(*)::int n FROM registrations WHERE asistio AND universidad = 'Universidad Privada Antenor Orrego (UPAO)'")).rows[0].n)
    await pool.query("DELETE FROM registrations WHERE dni LIKE '9100000_'")
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
    expect(await changes.deleteRegistration(id)).toBe("Rosa María Quispe Díaz")
    expect((await pool.query("SELECT 1 FROM registrations WHERE id = $1", [id])).rowCount).toBe(0)
  })
})
