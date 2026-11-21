import "server-only";
import type { PoolClient } from "pg";
import { getPool } from "./db";
import {
  ensureYambolyTables,
  isGameStarted,
  logYambolyAudit,
  SESSION_ID,
  YambolyUserError,
  type YambolySession,
} from "./yamboly-db";
import {
  cleanParticipantName,
  DIFFICULTY_LABELS,
  requiredByDifficulty,
  SUGGESTED_BANK_SIZE,
  type Difficulty,
  type GameSettings,
  type ImportedQuestion,
  type QuestionInput,
} from "./yamboly-rules";

// Administración del Yámboly Quiz: banco de preguntas, categorías, premios y parámetros.
// Cada cambio bloquea la sesión de juego (para no cruzarse con una acción del moderador),
// aplica las reglas de bloqueo de la partida y queda en el historial.

export class YambolyAdminError extends YambolyUserError {}

const LOCKED_RULES = "La partida ya comenzó: las reglas quedan bloqueadas hasta reiniciarla desde la consola del moderador.";

type Context = { client: PoolClient; session: YambolySession; started: boolean; actor: string };

async function withSession<T>(actor: string, work: (ctx: Context) => Promise<T>): Promise<T> {
  await ensureYambolyTables();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const session = (await client.query("SELECT * FROM yamboly_sessions WHERE id = $1 FOR UPDATE", [SESSION_ID])).rows[0];
    if (!session) throw new YambolyAdminError("No se encontró la sesión del quiz.");
    const result = await work({ client, session, started: isGameStarted(session), actor });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505") {
      throw new YambolyAdminError("Ya existe un registro con ese nombre.");
    }
    throw error;
  } finally {
    client.release();
  }
}

function audit(ctx: Context, action: string, entityType: string, entityId: string | number | null, summary: string, details?: unknown) {
  return logYambolyAudit(ctx.client, {
    actor: ctx.actor,
    action,
    entityType,
    entityId,
    summary: ctx.started ? `${summary} (durante la partida)` : summary,
    details,
    duringGame: ctx.started,
  });
}

// ----------------- Consulta -----------------

export type QuestionFilters = { category: string; difficulty: string; type: string; status: string; q: string };

export function parseQuestionFilters(params: Record<string, string | string[] | undefined>): QuestionFilters {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.trim().slice(0, 120) : "";
  };
  return { category: one("categoria"), difficulty: one("dificultad"), type: one("tipo"), status: one("estado"), q: one("q") };
}

const escapeLike = (value: string) => `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function getYambolyAdminData(filters: QuestionFilters, editId: number | null = null) {
  await ensureYambolyTables();
  const pool = getPool();

  const where: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replace("?", `$${values.length}`));
  };
  if (/^\d+$/.test(filters.category)) add("q.category_id = ?", Number(filters.category));
  if (filters.difficulty in DIFFICULTY_LABELS) add("q.difficulty = ?", filters.difficulty);
  if (filters.type === "desempate") where.push("q.is_tiebreaker = TRUE");
  if (filters.type === "ronda") where.push("q.is_tiebreaker = FALSE");
  if (filters.status === "publicada") where.push("q.active = TRUE AND q.used = FALSE");
  if (filters.status === "oculta") where.push("q.active = FALSE");
  if (filters.status === "jugada") where.push("q.used = TRUE");
  if (filters.q) add("q.text ILIKE ?", escapeLike(filters.q));

  const [session, categories, questions, prizes, readiness, audit, editing] = await Promise.all([
    pool.query("SELECT * FROM yamboly_sessions WHERE id = $1", [SESSION_ID]),
    pool.query(
      `SELECT c.*,
         COUNT(q.id)::int AS total,
         COUNT(q.id) FILTER (WHERE q.active AND NOT q.is_tiebreaker AND NOT q.used)::int AS available
       FROM yamboly_categories c
       LEFT JOIN yamboly_questions q ON q.category_id = c.id
       GROUP BY c.id ORDER BY c.name ASC`
    ),
    pool.query(
      `SELECT q.*, c.name AS category_name, c.color AS category_color, c.active AS category_active
       FROM yamboly_questions q JOIN yamboly_categories c ON c.id = q.category_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY c.name ASC, q.is_tiebreaker ASC, q.difficulty ASC, q.id ASC`,
      values
    ),
    pool.query("SELECT * FROM yamboly_prizes WHERE session_id = $1 ORDER BY place ASC", [SESSION_ID]),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE NOT q.is_tiebreaker AND q.active AND c.active)::int AS bank,
         COUNT(*) FILTER (WHERE q.is_tiebreaker AND q.active AND NOT q.used)::int AS tiebreak_available,
         COUNT(*) FILTER (WHERE NOT q.is_tiebreaker AND q.active AND c.active AND NOT q.used AND q.difficulty = 'FACIL')::int AS facil,
         COUNT(*) FILTER (WHERE NOT q.is_tiebreaker AND q.active AND c.active AND NOT q.used AND q.difficulty = 'INTERMEDIA')::int AS intermedia,
         COUNT(*) FILTER (WHERE NOT q.is_tiebreaker AND q.active AND c.active AND NOT q.used AND q.difficulty = 'DIFICIL')::int AS dificil
       FROM yamboly_questions q JOIN yamboly_categories c ON c.id = q.category_id`
    ),
    pool.query("SELECT * FROM yamboly_audit_log WHERE session_id = $1 ORDER BY created_at DESC, id DESC LIMIT 150", [SESSION_ID]),
    editId ? pool.query("SELECT * FROM yamboly_questions WHERE id = $1", [editId]) : null,
  ]);

  const current = session.rows[0] as YambolySession;
  const counts = readiness.rows[0];
  const required = requiredByDifficulty(current.difficulty_sequence);
  const available: Record<Difficulty, number> = { FACIL: counts.facil, INTERMEDIA: counts.intermedia, DIFICIL: counts.dificil };

  return {
    session: current,
    started: isGameStarted(current),
    categories: categories.rows,
    questions: questions.rows,
    prizes: prizes.rows,
    audit: audit.rows,
    editing: editing?.rows[0] ?? null,
    readiness: {
      required,
      available,
      bank: counts.bank as number,
      suggestedBank: SUGGESTED_BANK_SIZE,
      tiebreakAvailable: counts.tiebreak_available as number,
      canStart: (Object.keys(required) as Difficulty[]).every((d) => available[d] >= required[d]),
    },
  };
}

// ----------------- Parámetros -----------------

export async function updateGameSettings(settings: GameSettings, actor: string) {
  return withSession(actor, async (ctx) => {
    if (ctx.started) throw new YambolyAdminError(LOCKED_RULES);
    await ctx.client.query(
      `UPDATE yamboly_sessions SET
         reading_duration_sec = $2, answering_duration_sec = $3, points_per_correct = $4,
         tie_threshold_ms = $5, difficulty_sequence = $6, total_rounds = $7, allow_late_entry = $8, updated_at = NOW()
       WHERE id = $1`,
      [
        SESSION_ID,
        settings.readingDurationSec,
        settings.answeringDurationSec,
        settings.pointsPerCorrect,
        settings.tieThresholdMs,
        settings.difficultySequence,
        settings.difficultySequence.length,
        settings.allowLateEntry,
      ]
    );
    const before = {
      readingDurationSec: ctx.session.reading_duration_sec,
      answeringDurationSec: ctx.session.answering_duration_sec,
      pointsPerCorrect: ctx.session.points_per_correct,
      tieThresholdMs: ctx.session.tie_threshold_ms,
      difficultySequence: ctx.session.difficulty_sequence,
      allowLateEntry: ctx.session.allow_late_entry,
    };
    await audit(ctx, "PARAMETROS_ACTUALIZADOS", "settings", SESSION_ID, "Actualizó los parámetros de la partida", { antes: before, despues: settings });
  });
}

// ----------------- Categorías -----------------

export type CategoryInput = { name: string; color: string };

export function validateCategory(name: unknown, color: unknown): CategoryInput {
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (cleanName.length < 2 || cleanName.length > 120) throw new YambolyAdminError("El nombre de la categoría debe tener entre 2 y 120 caracteres.");
  const cleanColor = typeof color === "string" ? color.trim() : "";
  if (!/^#[0-9a-f]{6}$/i.test(cleanColor)) throw new YambolyAdminError("Elige un color válido para la categoría.");
  return { name: cleanName, color: cleanColor.toLowerCase() };
}

export async function createCategory(input: CategoryInput, actor: string) {
  return withSession(actor, async (ctx) => {
    const res = await ctx.client.query(
      "INSERT INTO yamboly_categories (name, color, icon) VALUES ($1, $2, 'Sparkles') RETURNING id",
      [input.name, input.color]
    );
    await audit(ctx, "CATEGORIA_CREADA", "category", res.rows[0].id, `Creó la categoría «${input.name}»`, input);
  });
}

async function lockedCategory(ctx: Context, id: number) {
  const row = (await ctx.client.query("SELECT * FROM yamboly_categories WHERE id = $1 FOR UPDATE", [id])).rows[0];
  if (!row) throw new YambolyAdminError("La categoría ya no existe.");
  return row;
}

export async function updateCategory(id: number, input: CategoryInput, actor: string) {
  return withSession(actor, async (ctx) => {
    const before = await lockedCategory(ctx, id);
    await ctx.client.query("UPDATE yamboly_categories SET name = $2, color = $3 WHERE id = $1", [id, input.name, input.color]);
    await audit(ctx, "CATEGORIA_EDITADA", "category", id, `Editó la categoría «${before.name}»`, {
      antes: { name: before.name, color: before.color },
      despues: input,
    });
  });
}

export async function setCategoryActive(id: number, active: boolean, actor: string) {
  return withSession(actor, async (ctx) => {
    const category = await lockedCategory(ctx, id);
    if (ctx.session.current_category_id === id && !active && ["ROULETTE", "QUESTION_READING", "QUESTION_ANSWERING"].includes(ctx.session.status)) {
      throw new YambolyAdminError("La categoría está en juego ahora mismo; espera a que termine la ronda.");
    }
    await ctx.client.query("UPDATE yamboly_categories SET active = $2 WHERE id = $1", [id, active]);
    await audit(ctx, active ? "CATEGORIA_ACTIVADA" : "CATEGORIA_DESACTIVADA", "category", id,
      `${active ? "Activó" : "Desactivó"} la categoría «${category.name}» en la ruleta`);
  });
}

export async function deleteCategory(id: number, actor: string) {
  return withSession(actor, async (ctx) => {
    const category = await lockedCategory(ctx, id);
    const count = (await ctx.client.query("SELECT COUNT(*)::int AS n FROM yamboly_questions WHERE category_id = $1", [id])).rows[0].n;
    if (count > 0) throw new YambolyAdminError("Solo se pueden eliminar categorías sin preguntas. Desactívala o mueve sus preguntas primero.");
    await ctx.client.query("DELETE FROM yamboly_categories WHERE id = $1", [id]);
    await audit(ctx, "CATEGORIA_ELIMINADA", "category", id, `Eliminó la categoría «${category.name}»`);
  });
}

// ----------------- Preguntas -----------------

async function lockedQuestion(ctx: Context, id: number) {
  const row = (await ctx.client.query("SELECT * FROM yamboly_questions WHERE id = $1 FOR UPDATE", [id])).rows[0];
  if (!row) throw new YambolyAdminError("La pregunta ya no existe.");
  return row;
}

async function assertCategory(ctx: Context, categoryId: number) {
  const row = (await ctx.client.query("SELECT id FROM yamboly_categories WHERE id = $1", [categoryId])).rows[0];
  if (!row) throw new YambolyAdminError("Elige una categoría existente.");
}

function snapshot(row: { category_id: number; text: string; options: unknown; correct_option_id: string; difficulty: string; is_tiebreaker: boolean }) {
  return {
    categoryId: row.category_id,
    text: row.text,
    options: row.options,
    correctOptionId: row.correct_option_id,
    difficulty: row.difficulty,
    isTiebreaker: row.is_tiebreaker,
  };
}

const PLAYED = "Esta pregunta ya se jugó en la partida: no se puede modificar ni ocultar hasta reiniciarla.";

export async function createQuestion(categoryId: number, input: QuestionInput, actor: string) {
  return withSession(actor, async (ctx) => {
    await assertCategory(ctx, categoryId);
    const res = await ctx.client.query(
      `INSERT INTO yamboly_questions (category_id, text, options, correct_option_id, difficulty, is_tiebreaker)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [categoryId, input.text, JSON.stringify(input.options), input.correctOptionId, input.difficulty, input.isTiebreaker]
    );
    await audit(ctx, "PREGUNTA_CREADA", "question", res.rows[0].id,
      `Creó la pregunta #${res.rows[0].id}${input.isTiebreaker ? " (desempate)" : ""}`, { categoryId, ...input });
    return res.rows[0].id as number;
  });
}

export async function updateQuestion(id: number, categoryId: number, input: QuestionInput, actor: string) {
  return withSession(actor, async (ctx) => {
    const before = await lockedQuestion(ctx, id);
    if (before.used) throw new YambolyAdminError(PLAYED);
    await assertCategory(ctx, categoryId);
    await ctx.client.query(
      `UPDATE yamboly_questions SET category_id = $2, text = $3, options = $4, correct_option_id = $5,
         difficulty = $6, is_tiebreaker = $7, updated_at = NOW() WHERE id = $1`,
      [id, categoryId, input.text, JSON.stringify(input.options), input.correctOptionId, input.difficulty, input.isTiebreaker]
    );
    await audit(ctx, "PREGUNTA_EDITADA", "question", id, `Editó la pregunta #${id}`, {
      antes: snapshot(before),
      despues: { categoryId, ...input },
    });
  });
}

export async function setQuestionActive(id: number, active: boolean, actor: string) {
  return withSession(actor, async (ctx) => {
    const question = await lockedQuestion(ctx, id);
    if (question.used) throw new YambolyAdminError(PLAYED);
    await ctx.client.query("UPDATE yamboly_questions SET active = $2, updated_at = NOW() WHERE id = $1", [id, active]);
    await audit(ctx, active ? "PREGUNTA_PUBLICADA" : "PREGUNTA_OCULTA", "question", id,
      `${active ? "Publicó" : "Ocultó"} la pregunta #${id}`);
  });
}

export async function deleteQuestion(id: number, actor: string) {
  return withSession(actor, async (ctx) => {
    const question = await lockedQuestion(ctx, id);
    const refs = (await ctx.client.query(
      `SELECT (SELECT COUNT(*) FROM yamboly_answers WHERE question_id = $1)
            + (SELECT COUNT(*) FROM yamboly_tiebreak_rounds WHERE question_id = $1) AS n`,
      [id]
    )).rows[0];
    if (question.used || Number(refs.n) > 0) {
      throw new YambolyAdminError("Esta pregunta ya se usó y tiene respuestas asociadas: ocúltala en lugar de eliminarla.");
    }
    await ctx.client.query("DELETE FROM yamboly_questions WHERE id = $1", [id]);
    await audit(ctx, "PREGUNTA_ELIMINADA", "question", id, `Eliminó la pregunta #${id}`, snapshot(question));
  });
}

const CATEGORY_PALETTE = ["#006ff5", "#ae1df5", "#00d2ff", "#ff007a", "#ffb703", "#00f59b", "#f77f00", "#7928ca"];

export async function importQuestions(questions: ImportedQuestion[], actor: string) {
  return withSession(actor, async (ctx) => {
    const existingCategories = (await ctx.client.query("SELECT id, name FROM yamboly_categories")).rows as { id: number; name: string }[];
    const categoryIds = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));
    const createdCategories: string[] = [];
    let inserted = 0;
    let skipped = 0;

    for (const question of questions) {
      const key = question.category.toLowerCase();
      let categoryId = categoryIds.get(key);
      if (!categoryId) {
        const color = CATEGORY_PALETTE[(existingCategories.length + createdCategories.length) % CATEGORY_PALETTE.length];
        categoryId = (await ctx.client.query(
          "INSERT INTO yamboly_categories (name, color, icon) VALUES ($1, $2, 'Sparkles') RETURNING id",
          [question.category, color]
        )).rows[0].id as number;
        categoryIds.set(key, categoryId);
        createdCategories.push(question.category);
      }
      const duplicate = await ctx.client.query(
        "SELECT 1 FROM yamboly_questions WHERE category_id = $1 AND lower(text) = lower($2) LIMIT 1",
        [categoryId, question.text]
      );
      if (duplicate.rowCount) {
        skipped++;
        continue;
      }
      await ctx.client.query(
        `INSERT INTO yamboly_questions (category_id, text, options, correct_option_id, difficulty, is_tiebreaker)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [categoryId, question.text, JSON.stringify(question.options), question.correctOptionId, question.difficulty, question.isTiebreaker]
      );
      inserted++;
    }

    await audit(ctx, "PREGUNTAS_IMPORTADAS", "import", null,
      `Importó ${inserted} pregunta${inserted === 1 ? "" : "s"}${skipped ? ` (${skipped} repetidas omitidas)` : ""}`,
      { insertadas: inserted, omitidas: skipped, categoriasNuevas: createdCategories });
    return { inserted, skipped, createdCategories };
  });
}

// ----------------- Premios -----------------

export type PrizeInput = { title: string; description: string; imageUrl: string; units: number; conditions: string };

export function validatePrize(input: { title: unknown; description: unknown; imageUrl: unknown; units: unknown; conditions: unknown }): PrizeInput {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const title = text(input.title);
  if (title.length < 3 || title.length > 150) throw new YambolyAdminError("El nombre del premio debe tener entre 3 y 150 caracteres.");
  const description = text(input.description);
  if (description.length > 500) throw new YambolyAdminError("La descripción del premio no puede superar 500 caracteres.");
  const conditions = text(input.conditions);
  if (conditions.length > 500) throw new YambolyAdminError("Las condiciones no pueden superar 500 caracteres.");
  const imageUrl = text(input.imageUrl);
  if (imageUrl && (imageUrl.length > 300 || !/^(\/(?!\/)|https:\/\/)/.test(imageUrl))) {
    throw new YambolyAdminError("La imagen debe ser una ruta del sitio (/images/...) o un enlace https://.");
  }
  const unitsText = text(input.units);
  if (!/^\d+$/.test(unitsText) || Number(unitsText) < 1 || Number(unitsText) > 1000) {
    throw new YambolyAdminError("Las unidades deben ser un número entre 1 y 1000.");
  }
  return { title, description, imageUrl, units: Number(unitsText), conditions };
}

export async function createPrize(input: PrizeInput, actor: string) {
  return withSession(actor, async (ctx) => {
    if (ctx.started) throw new YambolyAdminError("La partida ya comenzó: no se pueden agregar puestos premiados hasta reiniciarla.");
    const place = (await ctx.client.query(
      "SELECT COALESCE(MAX(place), 0) + 1 AS place FROM yamboly_prizes WHERE session_id = $1",
      [SESSION_ID]
    )).rows[0].place as number;
    await ctx.client.query(
      `INSERT INTO yamboly_prizes (session_id, place, title, description, image_url, units, conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [SESSION_ID, place, input.title, input.description || null, input.imageUrl || null, input.units, input.conditions || null]
    );
    await audit(ctx, "PREMIO_CREADO", "prize", place, `Agregó el premio del puesto ${place}: «${input.title}»`, input);
  });
}

export async function updatePrize(place: number, input: PrizeInput, actor: string) {
  return withSession(actor, async (ctx) => {
    const before = (await ctx.client.query(
      "SELECT * FROM yamboly_prizes WHERE session_id = $1 AND place = $2 FOR UPDATE",
      [SESSION_ID, place]
    )).rows[0];
    if (!before) throw new YambolyAdminError("Ese premio ya no existe.");
    await ctx.client.query(
      `UPDATE yamboly_prizes SET title = $3, description = $4, image_url = $5, units = $6, conditions = $7
       WHERE session_id = $1 AND place = $2`,
      [SESSION_ID, place, input.title, input.description || null, input.imageUrl || null, input.units, input.conditions || null]
    );
    await audit(ctx, "PREMIO_EDITADO", "prize", place, `Editó el premio del puesto ${place}`, {
      antes: { title: before.title, description: before.description, imageUrl: before.image_url, units: before.units, conditions: before.conditions },
      despues: input,
    });
  });
}

/** Solo se elimina el último puesto, para que los puestos premiados sigan siendo consecutivos. */
export async function deleteLastPrize(actor: string) {
  return withSession(actor, async (ctx) => {
    if (ctx.started) throw new YambolyAdminError("La partida ya comenzó: no se pueden quitar puestos premiados hasta reiniciarla.");
    const last = (await ctx.client.query(
      "SELECT * FROM yamboly_prizes WHERE session_id = $1 ORDER BY place DESC LIMIT 1 FOR UPDATE",
      [SESSION_ID]
    )).rows[0];
    if (!last) throw new YambolyAdminError("No hay premios configurados.");
    await ctx.client.query("DELETE FROM yamboly_prizes WHERE id = $1", [last.id]);
    await audit(ctx, "PREMIO_ELIMINADO", "prize", last.place, `Quitó el premio del puesto ${last.place}: «${last.title}»`);
  });
}

// ----------------- Inscritos -----------------

async function lockedParticipant(ctx: Context, id: number) {
  const row = (await ctx.client.query(
    "SELECT * FROM yamboly_participants WHERE id = $1 AND session_id = $2 FOR UPDATE",
    [id, SESSION_ID]
  )).rows[0];
  if (!row) throw new YambolyAdminError("Ese inscrito ya no existe.");
  return row;
}

export type QuizParticipantRow = {
  id: number;
  full_name: string;
  dni: string | null;
  email: string | null;
  created_at: string;
  score: number;
  from_fullday: boolean;
};

/** Inscritos al quiz para la consola del moderador, más recientes primero. */
export async function listQuizParticipants(query = ""): Promise<QuizParticipantRow[]> {
  await ensureYambolyTables();
  const search = query.trim().slice(0, 120);
  const res = await getPool().query(
    `SELECT id, full_name, dni, email, created_at, score, registration_id IS NOT NULL AS from_fullday
     FROM yamboly_participants
     WHERE session_id = $1 ${search ? "AND (full_name ILIKE $2 OR dni ILIKE $2 OR email ILIKE $2)" : ""}
     ORDER BY created_at DESC, id DESC`,
    search ? [SESSION_ID, escapeLike(search)] : [SESSION_ID]
  );
  return res.rows;
}

export async function renameParticipant(id: number, name: unknown, actor: string) {
  const parsed = cleanParticipantName(name);
  if (!parsed.ok) throw new YambolyAdminError(parsed.error);
  return withSession(actor, async (ctx) => {
    const before = await lockedParticipant(ctx, id);
    if (before.full_name === parsed.value) return false;
    await ctx.client.query("UPDATE yamboly_participants SET full_name = $2 WHERE id = $1", [id, parsed.value]);
    await audit(ctx, "INSCRITO_RENOMBRADO", "participant", id, `Cambió el nombre «${before.full_name}» por «${parsed.value}»`, {
      antes: before.full_name,
      despues: parsed.value,
    });
    return true;
  });
}
