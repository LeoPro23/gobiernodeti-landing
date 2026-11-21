import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { fillParticipantTemplate, participantNamesText, PARTICIPANT_TEMPLATE_PATH } from "@/lib/participant-template"

const template = readFileSync(PARTICIPANT_TEMPLATE_PATH)

function sheetXml(bytes: Uint8Array) {
  const entry = XLSX.CFB.find(XLSX.CFB.read(bytes, { type: "buffer" }), "/xl/worksheets/sheet1.xml")
  return Buffer.from(entry.content).toString("utf8")
}
const rows = (bytes: Uint8Array) => XLSX.utils.sheet_to_json<unknown[]>(XLSX.read(bytes, { type: "buffer" }).Sheets.Inscritos, { header: 1 })

describe("plantilla de participantes", () => {
  it("conserva encabezado, ejemplo y la hoja oculta, y numera a cada persona", () => {
    const bytes = fillParticipantTemplate(template, [
      { fullName: "  Ana   Torres ", phone: "987654321" },
      { fullName: "José Pérez & Hijos <SAC>", email: "jose@correo.pe", phone: null },
    ])
    expect(rows(bytes)).toEqual([
      ["N°", "Nombre completo", "Correo electrónico", "Teléfono / WhatsApp"],
      ["Ej.", "Juan Pérez Gómez", "juan.perez@correo.com", "987654321"],
      [1, "Ana Torres", undefined, "987654321"],
      [2, "José Pérez & Hijos <SAC>", "jose@correo.pe"],
    ])
    expect(XLSX.read(bytes, { type: "buffer" }).SheetNames).toEqual(["Inscritos", "Ganadores"])
    const xml = sheetXml(bytes)
    expect(xml).toContain('<dimension ref="A1:D4"/>')
    // Mismos estilos que la plantilla: número centrado (3) y texto con fondo (4).
    expect(xml).toContain('<c r="A3" s="3"><v>1</v></c>')
    expect(xml).toContain('<c r="B4" s="4" t="inlineStr">')
    expect(xml).not.toContain('r="A5"')
  })

  it("admite más filas que las 200 que trae la plantilla", () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ fullName: `Persona ${i + 1}` }))
    const data = rows(fillParticipantTemplate(template, many))
    expect(data).toHaveLength(252)
    expect(data.at(-1)).toEqual([250, "Persona 250"])
  })

  it("genera el texto para la ruleta: un nombre completo por línea", () => {
    expect(participantNamesText(["Ana  Torres", " José\nPérez ", "", "Ryan Geofrey Valverde Ramírez"]))
      .toBe("Ana Torres\nJosé Pérez\nRyan Geofrey Valverde Ramírez\n")
    expect(participantNamesText([])).toBe("")
  })

  it("sin asistentes deja solo el encabezado y el ejemplo", () => {
    const bytes = fillParticipantTemplate(template, [])
    expect(rows(bytes)).toHaveLength(2)
    expect(sheetXml(bytes)).toContain('<dimension ref="A1:D2"/>')
  })
})
