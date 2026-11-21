import * as XLSX from "xlsx"

// Llena la plantilla «Formato_Sorteo_Participantes» (hoja «Inscritos») conservando su formato:
// encabezado, fila de ejemplo, estilos, anchos y la hoja oculta «Ganadores». SheetJS no conserva
// estilos al reescribir un libro, así que se edita directamente el XML de la hoja dentro del .xlsx.

export const PARTICIPANT_TEMPLATE_PATH = "public/export-templates/Formato_Sorteo_Participantes_XII_FULL_DAY_2026.xlsx"

export type TemplateParticipant = { fullName: string; email?: string | null; phone?: string | null }

const SHEET_PATH = "/xl/worksheets/sheet1.xml"
const FIRST_DATA_ROW = 3 // fila 1: encabezado; fila 2: ejemplo «Ej.»
// Índices de estilo de la plantilla: 3 = número centrado; 4 = texto con fondo amarillo.
const NUMBER_STYLE = 3
const TEXT_STYLE = 4

function escapeXml(value: string) {
  return value
    // Caracteres de control que XML no admite.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function textCell(ref: string, value: string | null | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim()
  return text
    ? `<c r="${ref}" s="${TEXT_STYLE}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`
    : `<c r="${ref}" s="${TEXT_STYLE}"/>`
}

function dataRow(index: number, participant: TemplateParticipant) {
  const r = FIRST_DATA_ROW + index
  return `<row r="${r}" spans="1:4" x14ac:dyDescent="0.25">`
    + `<c r="A${r}" s="${NUMBER_STYLE}"><v>${index + 1}</v></c>`
    + textCell(`B${r}`, participant.fullName)
    + textCell(`C${r}`, participant.email)
    + textCell(`D${r}`, participant.phone)
    + "</row>"
}

/**
 * Lista para ruletas externas: un participante por línea, con nombres y apellidos juntos.
 * Sin BOM y con saltos de línea simples, que es lo que esperan los importadores web.
 */
export function participantNamesText(names: string[]) {
  const lines = names.map(name => name.replace(/\s+/g, " ").trim()).filter(Boolean)
  return lines.length ? `${lines.join("\n")}\n` : ""
}

export function fillParticipantTemplate(template: Uint8Array, participants: TemplateParticipant[]): Uint8Array {
  const container = XLSX.CFB.read(template, { type: "buffer" })
  const entry = XLSX.CFB.find(container, SHEET_PATH)
  if (!entry) throw new Error("La plantilla no tiene la hoja de participantes.")
  const xml = Buffer.from(entry.content).toString("utf8")

  const header = xml.match(/<row r="1"[\s\S]*?<\/row>/)?.[0]
  const example = xml.match(/<row r="2"[\s\S]*?<\/row>/)?.[0]
  if (!header || !example || !xml.includes("<sheetData>")) throw new Error("La plantilla de participantes no tiene el formato esperado.")

  const rows = participants.map((participant, index) => dataRow(index, participant)).join("")
  const lastRow = FIRST_DATA_ROW - 1 + participants.length
  const filled = xml
    .replace(/<sheetData>[\s\S]*<\/sheetData>/, `<sheetData>${header}${example}${rows}</sheetData>`)
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:D${Math.max(2, lastRow)}"/>`)

  entry.content = Buffer.from(filled, "utf8")
  entry.size = entry.content.length
  return XLSX.CFB.write(container, { fileType: "zip", type: "buffer" })
}
