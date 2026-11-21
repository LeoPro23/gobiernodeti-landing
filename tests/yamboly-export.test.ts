import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createDrawWorkbook } from "@/lib/yamboly-export";

describe("exportación de empatados", () => {
  it("genera la hoja y columnas de la plantilla sin agregar el participante de ejemplo", () => {
    const data = createDrawWorkbook([
      { full_name: "Ana Pérez", email: "ana@example.test", phone: "0987654321" },
      { full_name: "Beto Díaz", email: "beto@example.test", phone: "+51 987 654 321" },
    ]);
    const book = XLSX.read(data, { type: "buffer" });
    expect(book.SheetNames).toEqual(["Inscritos"]);
    expect(XLSX.utils.sheet_to_json(book.Sheets.Inscritos, { header: 1 })).toEqual([
      ["N°", "Nombre completo", "Correo electrónico", "Teléfono / WhatsApp"],
      [1, "Ana Pérez", "ana@example.test", "0987654321"],
      [2, "Beto Díaz", "beto@example.test", "+51 987 654 321"],
    ]);
  });
});
