import { describe, expect, it } from "vitest"
import { DEFAULT_EXPORT_FILTER, exportWhere, parseExportFilter, serializeExportFilter, UNT_TENTH_CYCLE_RULE } from "@/lib/export-rules"

describe("reglas de exportación", () => {
  it("por defecto excluye a 10.° ciclo de la UNT y solo exporta asistentes", () => {
    expect(DEFAULT_EXPORT_FILTER).toEqual({ onlyAttended: true, rules: [UNT_TENTH_CYCLE_RULE] })
    const { sql, values } = exportWhere(DEFAULT_EXPORT_FILTER)
    expect(sql).toBe("WHERE asistio AND NOT (COALESCE(universidad, '') = $1 AND COALESCE(ciclo, '') = $2)")
    expect(values).toEqual(["Universidad Nacional de Trujillo (UNT)", "10.° ciclo"])
  })

  it("combina inclusiones con OR y exclusiones con AND NOT, siempre parametrizado", () => {
    const { sql, values } = exportWhere({
      onlyAttended: false,
      rules: [
        { mode: "include", universidad: "UPAO" },
        { mode: "include", carrera: "Sistemas", ciclo: "5.° ciclo" },
        { mode: "exclude", ciudad: "Lima, Lima" },
      ],
    })
    expect(sql).toBe("WHERE ((COALESCE(universidad, '') = $1) OR (COALESCE(carrera, '') = $2 AND COALESCE(ciclo, '') = $3)) AND NOT (COALESCE(ciudad, '') = $4)")
    expect(values).toEqual(["UPAO", "Sistemas", "5.° ciclo", "Lima, Lima"])
  })

  it("sin reglas ni filtro de asistencia exporta a todos", () => {
    expect(exportWhere({ onlyAttended: false, rules: [] })).toEqual({ sql: "", values: [] })
  })

  it("ignora datos inválidos y reglas vacías al leer la URL", () => {
    const attack = "'; DROP TABLE registrations; --"
    const reglas = JSON.stringify([
      { mode: "exclude", universidad: attack, "nombres; DROP": "x" },
      { mode: "borrar", ciclo: "10.° ciclo" },
      { mode: "include" },
      "texto",
    ])
    const filter = parseExportFilter({ reglas, solo_asistentes: "0" })
    expect(filter).toEqual({ onlyAttended: false, rules: [{ mode: "exclude", universidad: attack }] })
    // El texto del usuario solo viaja como parámetro, nunca dentro del SQL.
    expect(exportWhere(filter).sql).not.toContain("DROP")
    expect(parseExportFilter({ reglas: "{no es json" })).toEqual({ onlyAttended: true, rules: [] })
  })

  it("se puede guardar en la URL y volver a leer igual", () => {
    const filter = { onlyAttended: true, rules: [UNT_TENTH_CYCLE_RULE, { mode: "include" as const, ciudad: "Trujillo, La Libertad" }] }
    const params = serializeExportFilter(filter)
    expect(parseExportFilter({ reglas: params.get("reglas"), solo_asistentes: params.get("solo_asistentes") })).toEqual(filter)
  })
})
