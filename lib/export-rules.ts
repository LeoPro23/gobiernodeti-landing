// Reglas para exportar inscritos (Excel/TXT del sorteo): cada regla incluye o excluye a quienes
// cumplen TODAS sus condiciones. Con reglas de inclusión, la persona debe cumplir al menos una;
// y nunca debe cumplir una regla de exclusión. Módulo puro: se usa en el servidor y en el navegador.

export const EXPORT_FIELDS = [
  { key: "universidad", label: "Universidad" },
  { key: "carrera", label: "Carrera" },
  { key: "ciclo", label: "Ciclo" },
  { key: "ciudad", label: "Ciudad" },
] as const

export type ExportField = (typeof EXPORT_FIELDS)[number]["key"]
export type ExportRule = { mode: "include" | "exclude" } & Partial<Record<ExportField, string>>
export type ExportFilter = { onlyAttended: boolean; rules: ExportRule[] }

export const MAX_EXPORT_RULES = 20

/** Regla sugerida por la organización: los de 10.° ciclo de la UNT no entran al sorteo. */
export const UNT_TENTH_CYCLE_RULE: ExportRule = {
  mode: "exclude",
  universidad: "Universidad Nacional de Trujillo (UNT)",
  ciclo: "10.° ciclo",
}

export const DEFAULT_EXPORT_FILTER: ExportFilter = { onlyAttended: true, rules: [UNT_TENTH_CYCLE_RULE] }

const FIELD_KEYS = EXPORT_FIELDS.map(field => field.key) as ExportField[]

/** Condiciones con valor de una regla (los campos vacíos significan «cualquiera»). */
export function ruleConditions(rule: ExportRule) {
  return FIELD_KEYS.filter(key => typeof rule[key] === "string" && rule[key]!.trim() !== "").map(key => [key, rule[key]!.trim()] as const)
}

/** Lee el filtro desde la URL de forma estricta; cualquier dato inválido se descarta. */
export function parseExportFilter(params: { reglas?: string | null; solo_asistentes?: string | null }): ExportFilter {
  const onlyAttended = params.solo_asistentes !== "0"
  let raw: unknown = []
  try {
    raw = params.reglas ? JSON.parse(params.reglas) : []
  } catch {
    raw = []
  }
  const rules: ExportRule[] = []
  if (Array.isArray(raw)) {
    for (const item of raw.slice(0, MAX_EXPORT_RULES)) {
      if (!item || typeof item !== "object") continue
      const source = item as Record<string, unknown>
      if (source.mode !== "include" && source.mode !== "exclude") continue
      const rule: ExportRule = { mode: source.mode }
      for (const key of FIELD_KEYS) {
        const value = source[key]
        if (typeof value === "string" && value.trim() && value.length <= 200) rule[key] = value.trim()
      }
      if (ruleConditions(rule).length) rules.push(rule)
    }
  }
  return { onlyAttended, rules }
}

export function serializeExportFilter(filter: ExportFilter) {
  const params = new URLSearchParams()
  const rules = filter.rules.filter(rule => ruleConditions(rule).length)
  if (rules.length) params.set("reglas", JSON.stringify(rules.map(rule => Object.fromEntries([["mode", rule.mode], ...ruleConditions(rule)]))))
  if (!filter.onlyAttended) params.set("solo_asistentes", "0")
  return params
}

/** Condición SQL parametrizada sobre la tabla `registrations`. */
export function exportWhere(filter: ExportFilter, firstParam = 1) {
  const values: string[] = []
  const condition = (rule: ExportRule) => ruleConditions(rule)
    .map(([key, value]) => {
      values.push(value)
      // COALESCE: con un valor NULL, «NOT (ciudad = 'x')» daría NULL y excluiría a la persona por error.
      // `key` sale de una lista fija de columnas, nunca del usuario.
      return `COALESCE(${key}, '') = $${firstParam + values.length - 1}`
    })
    .join(" AND ")
  const parts: string[] = []
  if (filter.onlyAttended) parts.push("asistio")
  const includes = filter.rules.filter(rule => rule.mode === "include").map(condition)
  if (includes.length) parts.push(`(${includes.map(sql => `(${sql})`).join(" OR ")})`)
  for (const rule of filter.rules.filter(rule => rule.mode === "exclude")) parts.push(`NOT (${condition(rule)})`)
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", values }
}

/** Descripción corta de una regla, para mostrarla en el panel. */
export function describeRule(rule: ExportRule) {
  const conditions = ruleConditions(rule).map(([, value]) => value)
  return `${rule.mode === "include" ? "Incluir" : "Excluir"}: ${conditions.join(" · ") || "sin condiciones"}`
}
