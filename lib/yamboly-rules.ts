// Reglas puras del Yámboly Quiz Challenge: clasificación, empates técnicos,
// desempate, parámetros de partida y validación/importación de preguntas.
// No accede a la base de datos para poder probarse de forma aislada.

export const DIFFICULTIES = ["FACIL", "INTERMEDIA", "DIFICIL"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  FACIL: "Fácil",
  INTERMEDIA: "Intermedia",
  DIFICIL: "Difícil",
};

export const DEFAULT_SETTINGS = {
  readingDurationSec: 8,
  answeringDurationSec: 20,
  pointsPerCorrect: 4,
  tieThresholdMs: 1000,
  difficultySequence: ["FACIL", "INTERMEDIA", "INTERMEDIA", "DIFICIL", "DIFICIL"] as Difficulty[],
  allowLateEntry: false,
};

export const MAX_ROUNDS = 10;
export const SUGGESTED_BANK_SIZE = 20;

// ----------------- Clasificación y empates -----------------

export type RankInput = {
  id: number;
  full_name: string;
  score: number;
  correct_count: number;
  total_response_time_ms: number;
  difficult_correct: number;
  intermediate_correct: number;
};

export type TiebreakRoundResult = {
  round: number;
  contenderIds: number[];
  /** Respuestas recibidas; un contendiente sin respuesta cuenta como incorrecto. */
  answers: Map<number, { isCorrect: boolean; responseTimeMs: number }>;
};

export type RankedEntry = RankInput & {
  position: number;
  /** Identificador del grupo en empate técnico sin resolver (null si no está empatado). */
  tie_group: number | null;
  /** Estaba en empate técnico y su puesto lo definió una pregunta de desempate. */
  resolved_by_tiebreak: boolean;
};

export type TieGroup = {
  id: number;
  /** Primer puesto que ocupa el grupo (1 = primer lugar). */
  fromPosition: number;
  toPosition: number;
  memberIds: number[];
};

function compareBase(a: RankInput, b: RankInput) {
  return (
    b.score - a.score ||
    b.difficult_correct - a.difficult_correct ||
    b.intermediate_correct - a.intermediate_correct ||
    a.total_response_time_ms - b.total_response_time_ms ||
    a.id - b.id
  );
}

/**
 * Agrupa una lista ya ordenada por tiempo ascendente: cada grupo reúne a quienes
 * están a menos de `thresholdMs` del mejor tiempo del grupo (regla acordada).
 */
function groupByTime<T>(items: T[], time: (item: T) => number, thresholdMs: number): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const current = groups[groups.length - 1];
    if (current && time(item) - time(current[0]) < thresholdMs) current.push(item);
    else groups.push([item]);
  }
  return groups;
}

/** Ordena un grupo empatado usando las preguntas de desempate en las que participó completo. */
function refineWithTiebreaks(
  members: RankInput[],
  rounds: TiebreakRoundResult[],
  from: number,
  thresholdMs: number
): RankInput[][] {
  if (members.length < 2) return [members];
  const index = rounds.findIndex(
    (round, i) => i >= from && members.every((m) => round.contenderIds.includes(m.id))
  );
  if (index === -1) return [members];

  const round = rounds[index];
  const result = (m: RankInput) => round.answers.get(m.id);
  const correct = members
    .filter((m) => result(m)?.isCorrect)
    .sort((a, b) => result(a)!.responseTimeMs - result(b)!.responseTimeMs || a.id - b.id);
  const wrong = members.filter((m) => !result(m)?.isCorrect);

  const subgroups = [
    ...groupByTime(correct, (m) => result(m)!.responseTimeMs, thresholdMs),
    ...(wrong.length ? [wrong] : []),
  ];
  return subgroups.flatMap((group) => refineWithTiebreaks(group, rounds, index + 1, thresholdMs));
}

/**
 * Clasificación oficial: puntaje, aciertos difíciles, aciertos intermedios y menor
 * tiempo acumulado de respuestas correctas. Diferencias de tiempo menores al umbral
 * son empate técnico, que solo se rompe con preguntas de desempate.
 */
export function rankParticipants(
  rows: RankInput[],
  rounds: TiebreakRoundResult[] = [],
  thresholdMs = DEFAULT_SETTINGS.tieThresholdMs
): { ranking: RankedEntry[]; tieGroups: TieGroup[] } {
  const sorted = [...rows].sort(compareBase);

  const baseGroups: RankInput[][] = [];
  for (const row of sorted) {
    const current = baseGroups[baseGroups.length - 1];
    const anchor = current?.[0];
    if (
      anchor &&
      anchor.score === row.score &&
      anchor.difficult_correct === row.difficult_correct &&
      anchor.intermediate_correct === row.intermediate_correct &&
      row.total_response_time_ms - anchor.total_response_time_ms < thresholdMs
    ) {
      current.push(row);
    } else {
      baseGroups.push([row]);
    }
  }

  const resolved = new Set<number>();
  const finalGroups = baseGroups.flatMap((group) => {
    const refined = refineWithTiebreaks(group, rounds, 0, thresholdMs);
    if (group.length > 1) for (const sub of refined) if (sub.length === 1) resolved.add(sub[0].id);
    return refined;
  });

  const ranking: RankedEntry[] = [];
  const tieGroups: TieGroup[] = [];
  for (const group of finalGroups) {
    const fromPosition = ranking.length + 1;
    const tieId = group.length > 1 ? tieGroups.length + 1 : null;
    for (const member of group) {
      ranking.push({ ...member, position: ranking.length + 1, tie_group: tieId, resolved_by_tiebreak: resolved.has(member.id) });
    }
    if (tieId) {
      tieGroups.push({ id: tieId, fromPosition, toPosition: ranking.length, memberIds: group.map((m) => m.id) });
    }
  }
  return { ranking, tieGroups };
}

/** Empates sin resolver que alcanzan algún puesto premiado. */
export function relevantTieGroups(tieGroups: TieGroup[], prizePlaces: number) {
  return tieGroups.filter((group) => group.fromPosition <= prizePlaces);
}

// ----------------- Parámetros de partida -----------------

export type GameSettings = typeof DEFAULT_SETTINGS;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function integerInRange(value: unknown, label: string, min: number, max: number): Result<number> {
  const text = typeof value === "string" ? value.trim() : String(value ?? "");
  if (!/^\d+$/.test(text)) return { ok: false, error: `${label} debe ser un número entero.` };
  const number = Number(text);
  if (number < min || number > max) return { ok: false, error: `${label} debe estar entre ${min} y ${max}.` };
  return { ok: true, value: number };
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

export function parseGameSettings(input: {
  readingDurationSec: unknown;
  answeringDurationSec: unknown;
  pointsPerCorrect: unknown;
  tieThresholdMs: unknown;
  difficultySequence: unknown[];
  allowLateEntry: unknown;
}): Result<GameSettings> {
  const reading = integerInRange(input.readingDurationSec, "El tiempo de lectura", 3, 60);
  if (!reading.ok) return reading;
  const answering = integerInRange(input.answeringDurationSec, "El tiempo de respuesta", 5, 120);
  if (!answering.ok) return answering;
  const points = integerInRange(input.pointsPerCorrect, "Los puntos por acierto", 1, 100);
  if (!points.ok) return points;
  const threshold = integerInRange(input.tieThresholdMs, "El umbral de empate técnico", 0, 10000);
  if (!threshold.ok) return threshold;

  const sequence = input.difficultySequence
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (!sequence.length) return { ok: false, error: "Configura al menos una ronda." };
  if (sequence.length > MAX_ROUNDS) return { ok: false, error: `El máximo es de ${MAX_ROUNDS} rondas.` };
  if (!sequence.every(isDifficulty)) return { ok: false, error: "Hay una dificultad de ronda no válida." };

  return {
    ok: true,
    value: {
      readingDurationSec: reading.value,
      answeringDurationSec: answering.value,
      pointsPerCorrect: points.value,
      tieThresholdMs: threshold.value,
      difficultySequence: sequence,
      allowLateEntry: input.allowLateEntry === true || input.allowLateEntry === "on" || input.allowLateEntry === "true",
    },
  };
}

/** Cuántas preguntas de cada dificultad exige una secuencia de rondas. */
export function requiredByDifficulty(sequence: readonly string[]) {
  const required: Record<Difficulty, number> = { FACIL: 0, INTERMEDIA: 0, DIFICIL: 0 };
  for (const difficulty of sequence) if (isDifficulty(difficulty)) required[difficulty] += 1;
  return required;
}

// ----------------- Preguntas -----------------

export const OPTION_IDS = ["A", "B", "C", "D"] as const;

export type QuestionInput = {
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  difficulty: Difficulty;
  isTiebreaker: boolean;
};

export function validateQuestion(input: {
  text: unknown;
  options: unknown[];
  correctOptionId: unknown;
  difficulty: unknown;
  isTiebreaker?: unknown;
}): Result<QuestionInput> {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (text.length < 5) return { ok: false, error: "Escribe el enunciado de la pregunta." };
  if (text.length > 500) return { ok: false, error: "El enunciado no puede superar 500 caracteres." };

  const options: { id: string; text: string }[] = [];
  let gap = false;
  for (let i = 0; i < OPTION_IDS.length; i++) {
    const value = typeof input.options[i] === "string" ? (input.options[i] as string).trim() : "";
    if (!value) {
      gap = true;
      continue;
    }
    if (gap) return { ok: false, error: "Completa las alternativas en orden, sin dejar huecos." };
    if (value.length > 200) return { ok: false, error: `La alternativa ${OPTION_IDS[i]} no puede superar 200 caracteres.` };
    options.push({ id: OPTION_IDS[i], text: value });
  }
  if (options.length < 2) return { ok: false, error: "Incluye al menos las alternativas A y B." };
  const texts = options.map((option) => option.text.toLowerCase());
  if (new Set(texts).size !== texts.length) return { ok: false, error: "Hay alternativas repetidas." };

  const correct = typeof input.correctOptionId === "string" ? input.correctOptionId.trim().toUpperCase() : "";
  if (!options.some((option) => option.id === correct)) {
    return { ok: false, error: "La respuesta correcta debe ser una de las alternativas escritas." };
  }

  const difficulty = typeof input.difficulty === "string" ? normalizeDifficulty(input.difficulty) : null;
  if (!difficulty) return { ok: false, error: "Elige una dificultad válida." };

  return {
    ok: true,
    value: { text, options, correctOptionId: correct, difficulty, isTiebreaker: truthy(input.isTiebreaker) },
  };
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeDifficulty(value: string): Difficulty | null {
  const key = stripAccents(value).trim().toUpperCase();
  return isDifficulty(key) ? key : null;
}

function truthy(value: unknown) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["si", "sí", "s", "true", "1", "x", "on", "yes"].includes(value.trim().toLowerCase());
}

// ----------------- Inscripción de participantes -----------------

/** DNI peruano o carné de extranjería: solo dígitos, como en la inscripción del Fullday. */
export function normalizeDni(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const dni = value.trim();
  return /^\d{8,12}$/.test(dni) ? dni : null;
}

export function cleanParticipantName(value: unknown): Result<string> {
  const name = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (name.length < 3) return { ok: false, error: "Ingresa nombres y apellidos." };
  if (name.length > 200) return { ok: false, error: "El nombre no puede superar 200 caracteres." };
  return { ok: true, value: name };
}

export function cleanEmail(value: unknown): Result<string> {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Ingresa un correo válido." };
  return { ok: true, value: email };
}

// ----------------- Importación CSV -----------------

export type ImportedQuestion = QuestionInput & { category: string };

/** Lee CSV con comillas; admite coma o punto y coma (Excel en español) como separador. */
export function parseCsv(text: string): string[][] {
  const content = text.replace(/^﻿/, "");
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (quoted) {
      if (char === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export const IMPORT_TEMPLATE =
  "categoria,dificultad,pregunta,a,b,c,d,correcta,desempate\n" +
  '"Gobierno de TI & COBIT",FACIL,"¿Qué entidad creó COBIT?",IEEE,ISACA,ISO,W3C,B,no\n' +
  '"Auditoría de Sistemas",DIFICIL,"¿Qué control detecta eventos ya ocurridos?",Preventivo,Detectivo,Correctivo,Disuasivo,B,si\n';

const MAX_IMPORT_ROWS = 500;

export function parseQuestionImport(text: string): { ok: true; questions: ImportedQuestion[] } | { ok: false; errors: string[] } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, errors: ["El archivo debe tener una fila de encabezados y al menos una pregunta."] };

  const header = rows[0].map((cell) => stripAccents(cell).trim().toLowerCase());
  const column = (name: string) => header.indexOf(name);
  const missing = ["categoria", "dificultad", "pregunta", "a", "b", "correcta"].filter((name) => column(name) === -1);
  if (missing.length) return { ok: false, errors: [`Faltan columnas: ${missing.join(", ")}.`] };
  if (rows.length - 1 > MAX_IMPORT_ROWS) return { ok: false, errors: [`Importa como máximo ${MAX_IMPORT_ROWS} preguntas por vez.`] };

  const cell = (cells: string[], name: string) => (column(name) === -1 ? "" : (cells[column(name)] ?? "").trim());
  const errors: string[] = [];
  const questions: ImportedQuestion[] = [];
  const lines: number[] = [];
  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const category = cell(cells, "categoria");
    if (!category) return errors.push(`Fila ${line}: falta la categoría.`);
    if (category.length > 120) return errors.push(`Fila ${line}: el nombre de la categoría es demasiado largo.`);
    const parsed = validateQuestion({
      text: cell(cells, "pregunta"),
      options: OPTION_IDS.map((id) => cell(cells, id.toLowerCase())),
      correctOptionId: cell(cells, "correcta"),
      difficulty: cell(cells, "dificultad"),
      isTiebreaker: cell(cells, "desempate"),
    });
    if (!parsed.ok) return errors.push(`Fila ${line}: ${parsed.error}`);
    questions.push({ ...parsed.value, category });
    lines.push(line);
  });

  const seen = new Map<string, number>();
  questions.forEach((question, index) => {
    const key = `${question.category.toLowerCase()}|${question.text.toLowerCase()}`;
    if (seen.has(key)) errors.push(`Fila ${lines[index]}: pregunta repetida en el archivo (igual a la fila ${seen.get(key)}).`);
    else seen.set(key, lines[index]);
  });

  return errors.length ? { ok: false, errors } : { ok: true, questions };
}
