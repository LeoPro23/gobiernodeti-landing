import * as XLSX from "xlsx";

export type DrawParticipant = { full_name: string; email: string | null; phone: string | null };

/** Columnas y nombre de hoja compatibles con la plantilla de sorteo. */
export function createDrawWorkbook(participants: DrawParticipant[]): Uint8Array {
  const rows = [
    ["N°", "Nombre completo", "Correo electrónico", "Teléfono / WhatsApp"],
    ...participants.map((participant, index) => [index + 1, participant.full_name, participant.email ?? "", participant.phone ?? ""]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 35 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Inscritos");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
