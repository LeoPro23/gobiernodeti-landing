import "server-only";
import type { Pool, PoolClient } from "pg";
import { ensureRegistrationTable, getPool } from "./db";
import { randomBytes } from "node:crypto";
import { remainingTimeMs } from "./yamboly-timer";
import {
  cleanEmail,
  cleanParticipantName,
  DEFAULT_SETTINGS,
  normalizeDni,
  rankParticipants,
  relevantTieGroups,
  requiredByDifficulty,
  type RankInput,
  type TiebreakRoundResult,
} from "./yamboly-rules";

type Queryable = Pool | PoolClient;

export const SESSION_ID = "fullday";

let yambolyEnsured: Promise<void> | null = null;

/** Crea o migra las tablas una sola vez por proceso, aunque lleguen varias solicitudes a la vez. */
export function ensureYambolyTables() {
  yambolyEnsured ??= createYambolyTables().catch((error) => {
    yambolyEnsured = null;
    throw error;
  });
  return yambolyEnsured;
}

async function createYambolyTables() {
  const pool = getPool();

  const query = `
    CREATE TABLE IF NOT EXISTS yamboly_sessions (
      id VARCHAR(50) PRIMARY KEY,
      status VARCHAR(50) NOT NULL DEFAULT 'WAITING_REGISTRATION',
      current_round INTEGER NOT NULL DEFAULT 0,
      total_rounds INTEGER NOT NULL DEFAULT 5,
      current_category_id INTEGER,
      current_question_id INTEGER,
      reading_start_time TIMESTAMP WITH TIME ZONE,
      reading_duration_sec INTEGER NOT NULL DEFAULT 8,
      answering_start_time TIMESTAMP WITH TIME ZONE,
      answering_duration_sec INTEGER NOT NULL DEFAULT 20,
      is_registration_open BOOLEAN NOT NULL DEFAULT TRUE,
      allow_late_entry BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS yamboly_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      color VARCHAR(30) NOT NULL,
      icon VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS yamboly_questions (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES yamboly_categories(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_option_id VARCHAR(10) NOT NULL,
      difficulty VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIA',
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS yamboly_participants (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(50) NOT NULL REFERENCES yamboly_sessions(id) ON DELETE CASCADE,
      full_name VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      token VARCHAR(100) NOT NULL UNIQUE,
      score INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      total_response_time_ms INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS yamboly_answers (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(50) NOT NULL,
      participant_id INTEGER NOT NULL REFERENCES yamboly_participants(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES yamboly_questions(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL,
      selected_option_id VARCHAR(10) NOT NULL,
      is_correct BOOLEAN NOT NULL,
      response_time_ms INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_yamboly_answer_participant_question UNIQUE (participant_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS yamboly_prizes (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(50) NOT NULL,
      place INTEGER NOT NULL,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      image_url VARCHAR(300),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_yamboly_prize_session_place UNIQUE (session_id, place)
    );

    CREATE INDEX IF NOT EXISTS idx_yamboly_participants_session ON yamboly_participants(session_id);
    CREATE INDEX IF NOT EXISTS idx_yamboly_participants_score ON yamboly_participants(score DESC, total_response_time_ms ASC);
    CREATE INDEX IF NOT EXISTS idx_yamboly_answers_question ON yamboly_answers(question_id);
    ALTER TABLE yamboly_participants ALTER COLUMN email DROP NOT NULL, ALTER COLUMN phone DROP NOT NULL;
    ALTER TABLE yamboly_sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

    -- Parámetros configurables desde la administración.
    ALTER TABLE yamboly_sessions
      ADD COLUMN IF NOT EXISTS points_per_correct INTEGER NOT NULL DEFAULT 4,
      ADD COLUMN IF NOT EXISTS tie_threshold_ms INTEGER NOT NULL DEFAULT 1000,
      ADD COLUMN IF NOT EXISTS max_tiebreak_questions INTEGER NOT NULL DEFAULT 3,
      ADD COLUMN IF NOT EXISTS difficulty_sequence TEXT[] NOT NULL DEFAULT ARRAY['FACIL','INTERMEDIA','INTERMEDIA','DIFICIL','DIFICIL'],
      ADD COLUMN IF NOT EXISTS tiebreak_round INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tiebreak_participant_ids INTEGER[] NOT NULL DEFAULT '{}';
    ALTER TABLE yamboly_categories ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE yamboly_questions
      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_tiebreaker BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    ALTER TABLE yamboly_prizes
      ADD COLUMN IF NOT EXISTS units INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS conditions TEXT;

    -- Desempate: cada pregunta adicional y los participantes que la disputan.
    CREATE TABLE IF NOT EXISTS yamboly_tiebreak_rounds (
      session_id VARCHAR(50) NOT NULL REFERENCES yamboly_sessions(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      question_id INTEGER NOT NULL REFERENCES yamboly_questions(id),
      participant_ids INTEGER[] NOT NULL,
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, round)
    );
    CREATE TABLE IF NOT EXISTS yamboly_tiebreak_answers (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(50) NOT NULL,
      round INTEGER NOT NULL,
      participant_id INTEGER NOT NULL REFERENCES yamboly_participants(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES yamboly_questions(id),
      selected_option_id VARCHAR(10) NOT NULL,
      is_correct BOOLEAN NOT NULL,
      response_time_ms INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_yamboly_tiebreak_answer UNIQUE (session_id, round, participant_id)
    );

    -- Historial de cambios de configuración y acciones del moderador.
    CREATE TABLE IF NOT EXISTS yamboly_audit_log (
      id BIGSERIAL PRIMARY KEY,
      session_id VARCHAR(50) NOT NULL,
      actor VARCHAR(200) NOT NULL,
      action VARCHAR(60) NOT NULL,
      entity_type VARCHAR(30) NOT NULL,
      entity_id VARCHAR(50),
      summary TEXT NOT NULL,
      details JSONB,
      during_game BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_yamboly_audit_created ON yamboly_audit_log(created_at DESC);

    -- Inscripción con DNI, vinculada a la inscripción del Fullday si existe.
    ALTER TABLE yamboly_participants
      ADD COLUMN IF NOT EXISTS dni VARCHAR(20),
      ADD COLUMN IF NOT EXISTS registration_id INTEGER;
    CREATE INDEX IF NOT EXISTS idx_yamboly_participants_dni ON yamboly_participants(session_id, dni);
  `;

  // La inscripción al quiz consulta la tabla de inscritos del Fullday.
  await ensureRegistrationTable();
  await pool.query(query);

  // Seed default session if not exists
  await pool.query(`
    INSERT INTO yamboly_sessions (id, status, current_round, total_rounds)
    VALUES ('fullday', 'WAITING_REGISTRATION', 0, 5)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Seed default prizes only for a brand-new installation (the admin may delete them later).
  const prizeCount = await pool.query("SELECT COUNT(*) FROM yamboly_prizes");
  const auditCount = await pool.query("SELECT COUNT(*) FROM yamboly_audit_log WHERE entity_type = 'prize'");
  if (parseInt(prizeCount.rows[0].count, 10) === 0 && parseInt(auditCount.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO yamboly_prizes (session_id, place, title, description, image_url)
      VALUES
        ('fullday', 1, '1er Puesto: Caja de Helados Yámboly Campeón', 'Caja de helados surtidos y Magneto Crunchy Vanilla Yámboly', '/images/sponsor/premio.webp'),
        ('fullday', 2, '2do Puesto: Caja de Helados Yámboly Silver', 'Caja de helados surtidos y Magneto Crunchy Vanilla Yámboly', '/images/sponsor/premio.webp'),
        ('fullday', 3, '3er Puesto: Caja de Helados Yámboly Bronze', 'Caja degustación de helados y Magneto Crunchy Vanilla Yámboly', '/images/sponsor/premio.webp')
      ON CONFLICT (session_id, place) DO NOTHING;
    `);
  } else {
    // Harmonize legacy titles and include Magneto Crunchy Vanilla
    await pool.query(`
      UPDATE yamboly_prizes
      SET title = CASE
        WHEN place = 1 THEN '1er Puesto: Caja de Helados Yámboly Campeón'
        WHEN place = 2 THEN '2do Puesto: Caja de Helados Yámboly Silver'
        WHEN place = 3 THEN '3er Puesto: Caja de Helados Yámboly Bronze'
        ELSE title
      END,
      description = CASE
        WHEN place = 1 THEN 'Caja de helados surtidos y Magneto Crunchy Vanilla Yámboly'
        WHEN place = 2 THEN 'Caja de helados surtidos y Magneto Crunchy Vanilla Yámboly'
        WHEN place = 3 THEN 'Caja degustación de helados y Magneto Crunchy Vanilla Yámboly'
        ELSE description
      END
      WHERE session_id = 'fullday' AND (description NOT LIKE '%Magneto Crunchy Vanilla%' OR title LIKE '%Pack%');
    `);
  }

  // Seed default categories and questions if none exist
  const catCount = await pool.query("SELECT COUNT(*) FROM yamboly_categories");
  if (parseInt(catCount.rows[0].count, 10) === 0) {
    await seedInitialQuizData(pool);
  }
}

// Initial seed data based on the congress themes
async function seedInitialQuizData(pool: Queryable) {
  const categories = [
    { name: "Gobierno de TI & COBIT", color: "#006ff5", icon: "Building2" },
    { name: "Ciberseguridad & Resiliencia", color: "#ae1df5", icon: "ShieldAlert" },
    { name: "Auditoría de Sistemas", color: "#00d2ff", icon: "FileSearch" },
    { name: "Inteligencia Artificial & Datos", color: "#ff007a", icon: "Cpu" },
    { name: "Gestión de Riesgos TI", color: "#ffb703", icon: "AlertTriangle" },
  ];

  for (const cat of categories) {
    const res = await pool.query(
      "INSERT INTO yamboly_categories (name, color, icon) VALUES ($1, $2, $3) RETURNING id",
      [cat.name, cat.color, cat.icon]
    );
    const catId = res.rows[0].id;

    if (cat.name === "Gobierno de TI & COBIT") {
      await insertQuestion(pool, catId, {
        text: "¿Cuál es el propósito principal del marco de trabajo COBIT 2019?",
        options: [
          { id: "A", text: "Establecer estándares técnicos para desarrollo web" },
          { id: "B", text: "Alinear los objetivos empresariales con las metas de gobierno y gestión de TI" },
          { id: "C", text: "Reemplazar las funciones de los auditores financieros" },
          { id: "D", text: "Configurar servidores en centros de datos" },
        ],
        correct: "B",
        difficulty: "INTERMEDIA",
      });
      await insertQuestion(pool, catId, {
        text: "En COBIT, ¿cuál es la diferencia fundamental entre Gobierno y Gestión?",
        options: [
          { id: "A", text: "El Gobierno evalúa, dirige y monitorea (EDM); la Gestión planifica, construye, ejecuta y monitorea (PBRM)" },
          { id: "B", text: "El Gobierno lo ejecuta el área de TI y la Gestión la alta gerencia" },
          { id: "C", text: "Son exactamente lo mismo con diferente denominación" },
          { id: "D", text: "La Gestión define la estrategia a 10 años y el Gobierno solo compra licencias" },
        ],
        correct: "A",
        difficulty: "DIFICIL",
      });
      await insertQuestion(pool, catId, {
        text: "¿Qué entidad internacional es la creadora y promotora del framework COBIT?",
        options: [
          { id: "A", text: "IEEE" },
          { id: "B", text: "ISACA" },
          { id: "C", text: "ISO" },
          { id: "D", text: "W3C" },
        ],
        correct: "B",
        difficulty: "FACIL",
      });
    } else if (cat.name === "Ciberseguridad & Resiliencia") {
      await insertQuestion(pool, catId, {
        text: "¿Qué pilar del modelo Zero Trust resume la premisa básica de seguridad?",
        options: [
          { id: "A", text: "Confiar en todos los dispositivos de la red local" },
          { id: "B", text: "Nunca confiar, siempre verificar" },
          { id: "C", text: "Autenticar al usuario una sola vez al año" },
          { id: "D", text: "Desactivar firewalls para agilizar el tráfico" },
        ],
        correct: "B",
        difficulty: "FACIL",
      });
      await insertQuestion(pool, catId, {
        text: "¿Cuál es la función principal de un Centro de Operaciones de Seguridad (SOC)?",
        options: [
          { id: "A", text: "Monitorear, detectar y responder de forma continua ante incidentes de ciberseguridad" },
          { id: "B", text: "Vender hardware a los colaboradores de la empresa" },
          { id: "C", text: "Elaborar presupuestos contables anuales" },
          { id: "D", text: "Instalar impresoras en red" },
        ],
        correct: "A",
        difficulty: "INTERMEDIA",
      });
      await insertQuestion(pool, catId, {
        text: "En la gestión de incidentes, ¿qué métrica define el tiempo máximo tolerable de interrupción de un servicio?",
        options: [
          { id: "A", text: "RPO (Recovery Point Objective)" },
          { id: "B", text: "MTPD (Maximum Tolerable Period of Disruption)" },
          { id: "C", text: "MTBF (Mean Time Between Failures)" },
          { id: "D", text: "KPI de ventas" },
        ],
        correct: "B",
        difficulty: "DIFICIL",
      });
    } else if (cat.name === "Auditoría de Sistemas") {
      await insertQuestion(pool, catId, {
        text: "¿Cuál es la certificación internacional más reconocida para auditores de sistemas otorgada por ISACA?",
        options: [
          { id: "A", text: "CCNA" },
          { id: "B", text: "CISA (Certified Information Systems Auditor)" },
          { id: "C", text: "PMP" },
          { id: "D", text: "AWS Solutions Architect" },
        ],
        correct: "B",
        difficulty: "FACIL",
      });
      await insertQuestion(pool, catId, {
        text: "¿Qué tipo de control se implementa para descubrir eventos indeseables una vez que ya han ocurrido?",
        options: [
          { id: "A", text: "Control Preventivo" },
          { id: "B", text: "Control Detectivo" },
          { id: "C", text: "Control Correctivo" },
          { id: "D", text: "Control Disuasivo" },
        ],
        correct: "B",
        difficulty: "INTERMEDIA",
      });
      await insertQuestion(pool, catId, {
        text: "En una auditoría de sistemas, ¿qué garantiza la independencia del auditor?",
        options: [
          { id: "A", text: "Que no tenga responsabilidades operativas sobre los sistemas o procesos evaluados" },
          { id: "B", text: "Que sea el mismo desarrollador que creó el software" },
          { id: "C", text: "Que trabaje únicamente desde su casa" },
          { id: "D", text: "Que no presente reportes a la dirección" },
        ],
        correct: "A",
        difficulty: "DIFICIL",
      });
    } else if (cat.name === "Inteligencia Artificial & Datos") {
      await insertQuestion(pool, catId, {
        text: "En la gobernanza de Inteligencia Artificial, ¿qué significa el principio de 'Explicabilidad' (XAI)?",
        options: [
          { id: "A", text: "Que el modelo de IA pueda ser entendido y justificado por seres humanos" },
          { id: "B", text: "Que el código fuente esté escrito obligatoriamente en Python" },
          { id: "C", text: "Que la IA pueda redactar correos de disculpa" },
          { id: "D", text: "Que el servidor consuma la menor cantidad de electricidad posible" },
        ],
        correct: "A",
        difficulty: "INTERMEDIA",
      });
      await insertQuestion(pool, catId, {
        text: "¿Cuál es uno de los mayores riesgos éticos y de gobernanza en modelos de lenguaje (LLMs)?",
        options: [
          { id: "A", text: "Alucinaciones y sesgos algorítmicos en la toma de decisiones" },
          { id: "B", text: "Que la computadora se sobrecaliente" },
          { id: "C", text: "Que el teclado deje de funcionar" },
          { id: "D", text: "Falta de conexión a bluetooth" },
        ],
        correct: "A",
        difficulty: "FACIL",
      });
    } else if (cat.name === "Gestión de Riesgos TI") {
      await insertQuestion(pool, catId, {
        text: "¿Cómo se define conceptualmente el Riesgo en los estándares internacionales como ISO 31000?",
        options: [
          { id: "A", text: "Efecto de la incertidumbre sobre los objetivos" },
          { id: "B", text: "Un virus informático activo" },
          { id: "C", text: "La pérdida de una contraseña" },
          { id: "D", text: "El costo de renovación de licencias" },
        ],
        correct: "A",
        difficulty: "INTERMEDIA",
      });
      await insertQuestion(pool, catId, {
        text: "¿Cuáles son las cuatro respuestas clásicas frente a un riesgo identificado?",
        options: [
          { id: "A", text: "Mitigar, Transferir, Evitar y Aceptar" },
          { id: "B", text: "Ignorar, Ocultar, Culpar y Borrar" },
          { id: "C", text: "Reiniciar, Formatear, Instalar y Apagar" },
          { id: "D", text: "Comprar, Vender, Alquilar y Prestar" },
        ],
        correct: "A",
        difficulty: "FACIL",
      });
    }
  }
}

async function insertQuestion(
  pool: Queryable,
  categoryId: number,
  q: { text: string; options: { id: string; text: string }[]; correct: string; difficulty: string }
) {
  await pool.query(
    `INSERT INTO yamboly_questions (category_id, text, options, correct_option_id, difficulty)
     VALUES ($1, $2, $3, $4, $5)`,
    [categoryId, q.text, JSON.stringify(q.options), q.correct, q.difficulty]
  );
}

// ----------------- Data Access Functions -----------------

export type YambolySession = {
  id: string;
  status: string;
  current_round: number;
  total_rounds: number;
  current_category_id: number | null;
  current_question_id: number | null;
  reading_start_time: string | null;
  reading_duration_sec: number;
  answering_start_time: string | null;
  answering_duration_sec: number;
  is_registration_open: boolean;
  allow_late_entry: boolean;
  paused_at: string | null;
  points_per_correct: number;
  tie_threshold_ms: number;
  max_tiebreak_questions: number;
  difficulty_sequence: string[];
  tiebreak_round: number;
  tiebreak_participant_ids: number[];
  updated_at: string;
};

/** La partida empezó (o terminó sin reiniciarse): reglas y preguntas usadas quedan bloqueadas. */
export function isGameStarted(session: Pick<YambolySession, "status" | "current_round">) {
  return session.status !== "WAITING_REGISTRATION" || session.current_round > 0;
}

export async function getYambolySession(sessionId = SESSION_ID): Promise<YambolySession | null> {
  await ensureYambolyTables();
  const res = await getPool().query(
    "SELECT * FROM yamboly_sessions WHERE id = $1",
    [sessionId]
  );
  return res.rows[0] || null;
}

export async function getYambolyCategories({ activeOnly = false } = {}) {
  await ensureYambolyTables();
  const res = await getPool().query(
    `SELECT * FROM yamboly_categories ${activeOnly ? "WHERE active = TRUE" : ""} ORDER BY id ASC`
  );
  return res.rows;
}

export async function getYambolyQuestions() {
  await ensureYambolyTables();
  const res = await getPool().query(
    `SELECT q.*, c.name as category_name, c.color as category_color
     FROM yamboly_questions q
     JOIN yamboly_categories c ON q.category_id = c.id
     ORDER BY q.id ASC`
  );
  return res.rows;
}

export async function getYambolyCurrentQuestion(questionId: number) {
  await ensureYambolyTables();
  const res = await getPool().query(
    `SELECT q.id, q.category_id, q.text, q.options, q.difficulty, q.correct_option_id, q.is_tiebreaker,
            c.name as category_name, c.color as category_color
     FROM yamboly_questions q
     JOIN yamboly_categories c ON q.category_id = c.id
     WHERE q.id = $1`,
    [questionId]
  );
  return res.rows[0] || null;
}

export async function getYambolyParticipantsCount(sessionId = SESSION_ID) {
  await ensureYambolyTables();
  const res = await getPool().query(
    "SELECT COUNT(*) as count FROM yamboly_participants WHERE session_id = $1",
    [sessionId]
  );
  return parseInt(res.rows[0]?.count || "0", 10);
}

/** Preguntas de desempate ya cerradas (reveladas); las abiertas aún no cambian la clasificación. */
async function getClosedTiebreakRounds(db: Queryable, sessionId: string): Promise<TiebreakRoundResult[]> {
  const res = await db.query(
    `SELECT r.round, r.participant_ids, a.participant_id, a.is_correct, a.response_time_ms
     FROM yamboly_tiebreak_rounds r
     LEFT JOIN yamboly_tiebreak_answers a ON a.session_id = r.session_id AND a.round = r.round
     WHERE r.session_id = $1 AND r.closed_at IS NOT NULL
     ORDER BY r.round ASC`,
    [sessionId]
  );
  const rounds = new Map<number, TiebreakRoundResult>();
  for (const row of res.rows) {
    let round = rounds.get(row.round);
    if (!round) {
      round = { round: row.round, contenderIds: row.participant_ids, answers: new Map() };
      rounds.set(row.round, round);
    }
    if (row.participant_id !== null) {
      round.answers.set(row.participant_id, { isCorrect: row.is_correct, responseTimeMs: row.response_time_ms });
    }
  }
  return [...rounds.values()];
}

export async function getYambolyPrizes(sessionId = SESSION_ID, db?: Queryable) {
  await ensureYambolyTables();
  const res = await (db ?? getPool()).query(
    "SELECT * FROM yamboly_prizes WHERE session_id = $1 ORDER BY place ASC",
    [sessionId]
  );
  return res.rows;
}

/** Clasificación completa con empates técnicos y desempates ya resueltos. */
export async function getYambolyRanking(sessionId = SESSION_ID, db?: Queryable) {
  await ensureYambolyTables();
  const client = db ?? getPool();
  const participantsQuery = () => client.query(
    `SELECT p.id, p.full_name, p.score, p.correct_count, p.total_response_time_ms,
       COUNT(*) FILTER (WHERE a.is_correct AND q.difficulty = 'DIFICIL')::int AS difficult_correct,
       COUNT(*) FILTER (WHERE a.is_correct AND q.difficulty = 'INTERMEDIA')::int AS intermediate_correct
     FROM yamboly_participants p
     LEFT JOIN yamboly_answers a ON a.participant_id = p.id
     LEFT JOIN yamboly_questions q ON q.id = a.question_id
     WHERE p.session_id = $1
     GROUP BY p.id`,
    [sessionId]
  );
  const sessionQuery = () => client.query("SELECT tie_threshold_ms FROM yamboly_sessions WHERE id = $1", [sessionId]);
  const prizesQuery = () => client.query("SELECT COUNT(*)::int AS count FROM yamboly_prizes WHERE session_id = $1", [sessionId]);

  // Una conexión dentro de una transacción no admite consultas simultáneas; el pool sí.
  const [rows, session, rounds, prizes] = db
    ? [await participantsQuery(), await sessionQuery(), await getClosedTiebreakRounds(client, sessionId), await prizesQuery()]
    : await Promise.all([participantsQuery(), sessionQuery(), getClosedTiebreakRounds(client, sessionId), prizesQuery()]);
  const threshold = session.rows[0]?.tie_threshold_ms ?? DEFAULT_SETTINGS.tieThresholdMs;
  const prizePlaces = prizes.rows[0]?.count ?? 0;
  const { ranking, tieGroups } = rankParticipants(rows.rows as RankInput[], rounds, threshold);
  return { ranking, tieGroups, relevantTies: relevantTieGroups(tieGroups, prizePlaces), prizePlaces };
}

export async function getYambolyLeaderboard(sessionId = SESSION_ID, limit = 10) {
  const { ranking } = await getYambolyRanking(sessionId);
  return ranking.slice(0, limit);
}

export async function logYambolyAudit(
  db: Queryable,
  entry: {
    sessionId?: string;
    actor: string;
    action: string;
    entityType: string;
    entityId?: string | number | null;
    summary: string;
    details?: unknown;
    duringGame: boolean;
  }
) {
  await db.query(
    `INSERT INTO yamboly_audit_log (session_id, actor, action, entity_type, entity_id, summary, details, during_game)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.sessionId ?? SESSION_ID,
      entry.actor.slice(0, 200),
      entry.action,
      entry.entityType,
      entry.entityId == null ? null : String(entry.entityId),
      entry.summary,
      entry.details === undefined ? null : JSON.stringify(entry.details),
      entry.duringGame,
    ]
  );
}

/** Error con un mensaje pensado para mostrarse tal cual al participante o al administrador. */
export class YambolyUserError extends Error {}

const ALREADY_REGISTERED_HELP = "Usa el navegador con el que te registraste o consulta a la organización.";

function registrationBlocked(session: YambolySession): string | null {
  if (!session.is_registration_open && !session.allow_late_entry) return "El registro para esta dinámica ya fue cerrado por el moderador.";
  if (session.tiebreak_round > 0 || session.status === "TIEBREAK" || session.status === "PODIUM") return "La dinámica ya está en su etapa final.";
  return null;
}

function requireDni(value: unknown) {
  const dni = normalizeDni(value);
  if (!dni) throw new YambolyUserError("Ingresa un DNI válido de 8 a 12 dígitos.");
  return dni;
}

async function assertDniAvailable(db: Queryable, sessionId: string, dni: string) {
  const existing = await db.query("SELECT 1 FROM yamboly_participants WHERE session_id = $1 AND dni = $2 LIMIT 1", [sessionId, dni]);
  if (existing.rowCount) throw new YambolyUserError(`Este DNI ya está inscrito en el quiz. ${ALREADY_REGISTERED_HELP}`);
}

/** Inscripción del Fullday con ese DNI; solo se usa el nombre. */
async function findFulldayRegistration(db: Queryable, dni: string): Promise<{ id: number; full_name: string } | null> {
  const res = await db.query(
    // Las inscripciones hechas desde el panel pueden no tener apellidos.
    "SELECT id, concat_ws(' ', trim(nombres), NULLIF(trim(apellidos), '')) AS full_name FROM registrations WHERE dni = $1 LIMIT 1",
    [dni]
  );
  return res.rows[0] ?? null;
}

/** Primer paso del registro: si el DNI está inscrito en el Fullday, devuelve solo el nombre para que la persona lo confirme. */
export async function lookupYambolyDni(value: unknown, sessionId = SESSION_ID): Promise<{ found: true; fullName: string } | { found: false }> {
  await ensureYambolyTables();
  const dni = requireDni(value);
  const pool = getPool();
  const session = await getYambolySession(sessionId);
  if (!session) throw new YambolyUserError("La dinámica no está disponible.");
  const blocked = registrationBlocked(session);
  if (blocked) throw new YambolyUserError(blocked);
  await assertDniAvailable(pool, sessionId, dni);
  const registration = await findFulldayRegistration(pool, dni);
  return registration ? { found: true, fullName: registration.full_name } : { found: false };
}

export type ParticipantInput = { dni: unknown; fullName?: unknown; email?: unknown };

export type InsertedParticipant = {
  id: number;
  token: string;
  full_name: string;
  dni: string;
  email: string | null;
  registration_id: number | null;
};

/**
 * Inscribe a un participante dentro de una transacción que ya bloqueó la sesión.
 * Con DNI del Fullday se usa el nombre de esa inscripción, sin correo; sin él, el nombre
 * y el correo son obligatorios. Cada DNI y cada correo se inscriben una sola vez.
 */
async function insertYambolyParticipant(client: PoolClient, session: YambolySession, input: ParticipantInput): Promise<InsertedParticipant> {
  const blocked = registrationBlocked(session);
  if (blocked) throw new YambolyUserError(blocked);
  const dni = requireDni(input.dni);
  await assertDniAvailable(client, session.id, dni);

  const registration = await findFulldayRegistration(client, dni);
  let fullName: string;
  let email: string | null = null;
  if (registration) {
    fullName = registration.full_name.slice(0, 200);
  } else {
    const given = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
    const name = cleanParticipantName(given(input.fullName));
    const mail = given(input.email) ? cleanEmail(input.email) : null;
    if (!name.ok) throw new YambolyUserError(name.error);
    if (!mail) throw new YambolyUserError("Ingresa un correo.");
    if (!mail.ok) throw new YambolyUserError(mail.error);
    fullName = name.value;
    email = mail.value;
    const existing = await client.query("SELECT 1 FROM yamboly_participants WHERE session_id = $1 AND lower(email) = $2 LIMIT 1", [session.id, email]);
    if (existing.rowCount) throw new YambolyUserError(`Este correo ya está inscrito en el quiz. ${ALREADY_REGISTERED_HELP}`);
  }

  const res = await client.query(
    `INSERT INTO yamboly_participants (session_id, full_name, email, dni, registration_id, token)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, token, full_name, dni, email, registration_id`,
    [session.id, fullName, email, dni, registration?.id ?? null, randomBytes(32).toString("hex")]
  );
  return res.rows[0];
}

export async function registerYambolyParticipant(data: ParticipantInput & { sessionId?: string }) {
  await ensureYambolyTables();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const session = (await client.query("SELECT * FROM yamboly_sessions WHERE id = $1 FOR UPDATE", [data.sessionId || SESSION_ID])).rows[0];
    if (!session) throw new YambolyUserError("La dinámica no está disponible.");
    const participant = await insertYambolyParticipant(client, session, data);
    await client.query("COMMIT");
    return participant;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getParticipantByToken(token: string) {
  await ensureYambolyTables();
  const res = await getPool().query(
    "SELECT * FROM yamboly_participants WHERE token = $1",
    [token]
  );
  return res.rows[0] || null;
}

export async function submitYambolyAnswer(data: {
  token: string;
  questionId: number;
  selectedOptionId: string;
}) {
  await ensureYambolyTables();
  const client = await getPool().connect();
  try {
  await client.query("BEGIN");
  const participantResult = await client.query("SELECT * FROM yamboly_participants WHERE token = $1", [data.token]);
  const participant = participantResult.rows[0];
  if (!participant) throw new Error("Participante no válido o no encontrado.");

  const sessionResult = await client.query("SELECT * FROM yamboly_sessions WHERE id = $1 FOR UPDATE", [participant.session_id]);
  const session = sessionResult.rows[0] as YambolySession | undefined;
  if (!session) throw new Error("Sesión no activa.");

  if (session.paused_at) throw new Error("La partida está pausada.");

  if (session.status !== "QUESTION_ANSWERING") {
    throw new Error("El tiempo de respuesta para esta pregunta no está activo.");
  }

  if (session.current_question_id !== data.questionId) {
    throw new Error("La pregunta respondida no coincide con la ronda activa.");
  }

  const isTiebreak = session.tiebreak_round > 0;
  if (isTiebreak && !session.tiebreak_participant_ids.includes(participant.id)) {
    throw new Error("Esta pregunta de desempate es solo para los participantes empatados.");
  }

  // Calculate elapsed time from answering_start_time
  const startTime = session.answering_start_time ? new Date(session.answering_start_time).getTime() : Date.now();
  const responseTimeMs = Math.max(0, Date.now() - startTime);
  if (!session.answering_start_time || responseTimeMs >= session.answering_duration_sec * 1000) {
    throw new Error("El tiempo de respuesta ha terminado.");
  }

  // Check if already answered
  const existingAnswer = isTiebreak
    ? await client.query(
        "SELECT id FROM yamboly_tiebreak_answers WHERE session_id = $1 AND round = $2 AND participant_id = $3",
        [session.id, session.tiebreak_round, participant.id]
      )
    : await client.query(
        "SELECT id FROM yamboly_answers WHERE participant_id = $1 AND question_id = $2",
        [participant.id, data.questionId]
      );
  if (existingAnswer.rowCount && existingAnswer.rowCount > 0) {
    throw new Error("Ya enviaste tu respuesta para esta ronda.");
  }

  // Check correctness
  const qRes = await client.query(
    "SELECT correct_option_id, options FROM yamboly_questions WHERE id = $1",
    [data.questionId]
  );
  if (!qRes.rowCount || qRes.rowCount === 0) throw new Error("Pregunta no encontrada.");

  const selected = data.selectedOptionId.trim().toUpperCase();
  const correctOption = qRes.rows[0].correct_option_id;
  if (!qRes.rows[0].options.some((option: { id: string }) => option.id === selected)) {
    throw new Error("La alternativa seleccionada no es válida.");
  }
  const isCorrect = selected === correctOption.toUpperCase();

  if (isTiebreak) {
    // El desempate no suma puntos: solo ordena a los participantes empatados.
    await client.query(
      `INSERT INTO yamboly_tiebreak_answers
        (session_id, round, participant_id, question_id, selected_option_id, is_correct, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [session.id, session.tiebreak_round, participant.id, data.questionId, selected, isCorrect, responseTimeMs]
    );
    await client.query("COMMIT");
    return { submitted: true };
  }

  // Points rule: configurable points per correct answer, 0 for error
  const pointsAwarded = isCorrect ? session.points_per_correct : 0;

  // Insert answer
  await client.query(
    `INSERT INTO yamboly_answers
      (session_id, participant_id, question_id, round_number, selected_option_id, is_correct, response_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      participant.session_id,
      participant.id,
      data.questionId,
      session.current_round,
      selected,
      isCorrect,
      responseTimeMs,
    ]
  );

  // Update participant stats
  if (isCorrect) {
    await client.query(
      `UPDATE yamboly_participants
       SET score = score + $1,
           correct_count = correct_count + 1,
           total_response_time_ms = total_response_time_ms + $2
       WHERE id = $3`,
      [pointsAwarded, responseTimeMs, participant.id]
    );
  }

  await client.query("COMMIT");
  return { submitted: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ----------------- Moderator Action Controller -----------------

export type ModeratorActionType =
  | "OPEN_REGISTRATION"
  | "CLOSE_REGISTRATION"
  | "SPIN_ROULETTE"
  | "SHOW_QUESTION"
  | "START_READING"
  | "START_ANSWERING"
  | "REVEAL_ANSWER"
  | "SHOW_ROUND_RANKING"
  | "SHOW_PODIUM"
  | "PREPARE_TIEBREAK"
  | "START_TIEBREAK_QUESTION"
  | "RESET_GAME"
  | "PAUSE"
  | "RESUME";

const ACTION_SUMMARIES: Record<ModeratorActionType, string> = {
  OPEN_REGISTRATION: "Abrió la inscripción",
  CLOSE_REGISTRATION: "Cerró la inscripción",
  SPIN_ROULETTE: "Giró la ruleta",
  SHOW_QUESTION: "Mostró la pregunta",
  START_READING: "Inició el tiempo de lectura",
  START_ANSWERING: "Habilitó las respuestas",
  REVEAL_ANSWER: "Reveló la respuesta correcta",
  SHOW_ROUND_RANKING: "Mostró la clasificación",
  SHOW_PODIUM: "Publicó el podio final",
  PREPARE_TIEBREAK: "Anunció un desempate",
  START_TIEBREAK_QUESTION: "Lanzó una pregunta de desempate",
  RESET_GAME: "Reinició la partida (borró respuestas y puntajes)",
  PAUSE: "Pausó la partida",
  RESUME: "Reanudó la partida",
};

const ACTIVE_STAGES = ["ROULETTE", "QUESTION_READY", "QUESTION_READING", "QUESTION_ANSWERING", "QUESTION_REVEAL", "ROUND_RANKING", "TIEBREAK"];

const ALLOWED_STAGES: Record<ModeratorActionType, string[]> = {
  OPEN_REGISTRATION: ["WAITING_REGISTRATION"],
  CLOSE_REGISTRATION: ["WAITING_REGISTRATION"],
  SPIN_ROULETTE: ["WAITING_REGISTRATION", "ROUND_RANKING"],
  SHOW_QUESTION: ["ROULETTE"],
  START_READING: ["QUESTION_READY"],
  START_ANSWERING: ["QUESTION_READING"],
  REVEAL_ANSWER: ["QUESTION_ANSWERING"],
  SHOW_ROUND_RANKING: ["QUESTION_REVEAL"],
  SHOW_PODIUM: ["ROUND_RANKING"],
  PREPARE_TIEBREAK: ["ROUND_RANKING"],
  START_TIEBREAK_QUESTION: ["TIEBREAK"],
  RESET_GAME: ["WAITING_REGISTRATION", "PODIUM", "ROUND_RANKING"],
  PAUSE: ACTIVE_STAGES,
  RESUME: ACTIVE_STAGES,
};

export async function executeModeratorAction(action: {
  sessionId?: string;
  type: ModeratorActionType;
  categoryId?: number;
  questionId?: number;
  /** Solo para RESET_GAME: además de reiniciar, borra a los inscritos para empezar una partida nueva. */
  clearParticipants?: boolean;
}, actor = "moderador") {
  await ensureYambolyTables();
  const sessionId = action.sessionId || SESSION_ID;
  const pool = await getPool().connect();
  try {
  await pool.query("BEGIN");
  const session = (await pool.query("SELECT * FROM yamboly_sessions WHERE id = $1 FOR UPDATE", [sessionId])).rows[0] as YambolySession | undefined;
  if (!session) throw new Error("Sesión no encontrada.");

  if (!ALLOWED_STAGES[action.type]?.includes(session.status)) throw new Error("Acción no permitida en esta etapa.");
  if (session.paused_at && action.type !== "RESUME") throw new Error("Reanuda la partida antes de continuar.");
  if (!session.paused_at && action.type === "RESUME") throw new Error("La partida no está pausada.");
  const finished = session.current_round >= session.total_rounds;
  if (action.type === "SPIN_ROULETTE" && (finished || session.tiebreak_round > 0)) throw new Error("La partida ya completó sus rondas.");
  if ((action.type === "SHOW_PODIUM" || action.type === "PREPARE_TIEBREAK") && !finished) throw new Error("Aún quedan rondas por jugar.");
  if (action.type === "START_ANSWERING" && remainingTimeMs(session.reading_start_time, session.reading_duration_sec, Date.now()) !== 0) {
    throw new Error("El tiempo de lectura aún no ha terminado.");
  }
  if (action.type === "REVEAL_ANSWER" && remainingTimeMs(session.answering_start_time, session.answering_duration_sec, Date.now()) !== 0) {
    throw new Error("El tiempo de votación aún no ha terminado.");
  }
  let summary = ACTION_SUMMARIES[action.type];

  switch (action.type) {
    case "PAUSE": {
      await pool.query("UPDATE yamboly_sessions SET paused_at = clock_timestamp(), updated_at = NOW() WHERE id = $1", [sessionId]);
      break;
    }
    case "RESUME": {
      await pool.query(`UPDATE yamboly_sessions SET
        reading_start_time = CASE WHEN status = 'QUESTION_READING' THEN reading_start_time + (clock_timestamp() - paused_at) ELSE reading_start_time END,
        answering_start_time = CASE WHEN status = 'QUESTION_ANSWERING' THEN answering_start_time + (clock_timestamp() - paused_at) ELSE answering_start_time END,
        paused_at = NULL, updated_at = NOW() WHERE id = $1`, [sessionId]);
      break;
    }
    case "OPEN_REGISTRATION": {
      await pool.query(
        "UPDATE yamboly_sessions SET is_registration_open = TRUE, status = 'WAITING_REGISTRATION', updated_at = NOW() WHERE id = $1",
        [sessionId]
      );
      break;
    }
    case "CLOSE_REGISTRATION": {
      await pool.query(
        "UPDATE yamboly_sessions SET is_registration_open = FALSE, updated_at = NOW() WHERE id = $1",
        [sessionId]
      );
      break;
    }
    case "SPIN_ROULETTE": {
      const sequence = session.difficulty_sequence?.length ? session.difficulty_sequence : DEFAULT_SETTINGS.difficultySequence;
      // Solo cuentan preguntas publicadas, de rondas normales y de categorías activas.
      const eligible = `q.used = FALSE AND q.active = TRUE AND q.is_tiebreaker = FALSE
        AND EXISTS (SELECT 1 FROM yamboly_categories c WHERE c.id = q.category_id AND c.active = TRUE)`;
      if (session.current_round === 0) {
        const counts = await pool.query(
          `SELECT q.difficulty, COUNT(*)::int AS count FROM yamboly_questions q WHERE ${eligible} GROUP BY q.difficulty`
        );
        const available = new Map<string, number>(counts.rows.map((row: { difficulty: string; count: number }) => [row.difficulty, row.count]));
        const required = requiredByDifficulty(sequence);
        const missing = (Object.entries(required) as [string, number][])
          .filter(([difficulty, count]) => (available.get(difficulty) || 0) < count);
        if (missing.length) {
          throw new Error(`Faltan preguntas publicadas para iniciar: se necesitan ${required.FACIL} fáciles, ${required.INTERMEDIA} intermedias y ${required.DIFICIL} difíciles.`);
        }
      }
      const difficulty = sequence[session.current_round];
      if (!difficulty) throw new Error("No hay dificultad configurada para esta ronda.");
      let chosenCatId = action.categoryId;
      if (!chosenCatId) {
        // Pick random active category that has eligible questions
        const catRes = await pool.query(
          `SELECT c.id FROM yamboly_categories c
           WHERE c.active = TRUE AND EXISTS (SELECT 1 FROM yamboly_questions q WHERE q.category_id = c.id AND q.difficulty = $1 AND ${eligible})
           ORDER BY RANDOM() LIMIT 1`, [difficulty]
        );
        if (catRes.rowCount && catRes.rowCount > 0) {
          chosenCatId = catRes.rows[0].id;
        } else {
          throw new Error(`No hay preguntas disponibles para la dificultad ${difficulty}.`);
        }
      }

      // Pick question from this category
      const qRes = await pool.query(
        `SELECT q.id FROM yamboly_questions q
         WHERE q.category_id = $1 AND q.difficulty = $2 AND ${eligible}
         ORDER BY RANDOM() LIMIT 1`,
        [chosenCatId, difficulty]
      );

      const questionId = qRes.rows[0]?.id;
      if (!questionId) {
        throw new Error("La categoría no tiene preguntas elegibles para esta ronda.");
      }

      await pool.query("UPDATE yamboly_questions SET used = TRUE WHERE id = $1", [questionId]);

      const nextRound = session.current_round + 1;
      summary = `Giró la ruleta (ronda ${nextRound} de ${sequence.length})`;

      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'ROULETTE',
             current_round = $1,
             total_rounds = $5,
             current_category_id = $2,
             current_question_id = $3,
             reading_start_time = NULL,
             answering_start_time = NULL,
             is_registration_open = FALSE,
             updated_at = NOW()
         WHERE id = $4`,
        [nextRound, chosenCatId, questionId, sessionId, sequence.length]
      );
      break;
    }
    case "SHOW_QUESTION": {
      await pool.query("UPDATE yamboly_sessions SET status = 'QUESTION_READY', reading_start_time = NULL, answering_start_time = NULL, updated_at = NOW() WHERE id = $1", [sessionId]);
      break;
    }
    case "START_READING": {
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'QUESTION_READING',
             reading_start_time = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      break;
    }
    case "START_ANSWERING": {
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'QUESTION_ANSWERING',
             answering_start_time = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      break;
    }
    case "REVEAL_ANSWER": {
      if (session.tiebreak_round > 0) {
        await pool.query(
          "UPDATE yamboly_tiebreak_rounds SET closed_at = NOW() WHERE session_id = $1 AND round = $2",
          [sessionId, session.tiebreak_round]
        );
      }
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'QUESTION_REVEAL',
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      break;
    }
    case "SHOW_ROUND_RANKING": {
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'ROUND_RANKING',
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      break;
    }
    case "SHOW_PODIUM": {
      const { relevantTies } = await getYambolyRanking(sessionId, pool);
      if (relevantTies.length) {
        throw new Error("Hay un empate técnico en puestos premiados. Inicia el desempate antes de publicar ganadores.");
      }
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'PODIUM',
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      break;
    }
    case "PREPARE_TIEBREAK": {
      if (session.tiebreak_round >= session.max_tiebreak_questions) throw new Error("Se alcanzó el límite de preguntas de desempate.");
      const { relevantTies } = await getYambolyRanking(sessionId, pool);
      if (!relevantTies.length) throw new Error("No hay empates técnicos que afecten puestos premiados.");
      const contenders = relevantTies.flatMap((group) => group.memberIds);
      summary = `Anunció un desempate entre ${contenders.length} participantes (${relevantTies
        .map((group) => `puestos ${group.fromPosition}–${group.toPosition}`)
        .join(", ")})`;
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'TIEBREAK',
             tiebreak_participant_ids = $2,
             current_category_id = NULL,
             current_question_id = NULL,
             reading_start_time = NULL,
             answering_start_time = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId, contenders]
      );
      break;
    }
    case "START_TIEBREAK_QUESTION": {
      if (session.tiebreak_round >= session.max_tiebreak_questions) throw new Error("Se alcanzó el límite de preguntas de desempate.");
      if (!session.tiebreak_participant_ids.length) throw new Error("No hay participantes en desempate.");
      // Preferimos el banco exclusivo de desempate; si se agotó, cualquier pregunta publicada sin usar.
      const qRes = await pool.query(
        `SELECT id, category_id, is_tiebreaker FROM yamboly_questions
         WHERE used = FALSE AND active = TRUE
         ORDER BY is_tiebreaker DESC, RANDOM() LIMIT 1`
      );
      const question = qRes.rows[0];
      if (!question) throw new Error("No quedan preguntas disponibles para el desempate. Agrega preguntas de desempate en la administración.");
      const nextTiebreak = session.tiebreak_round + 1;
      await pool.query("UPDATE yamboly_questions SET used = TRUE WHERE id = $1", [question.id]);
      await pool.query(
        "INSERT INTO yamboly_tiebreak_rounds (session_id, round, question_id, participant_ids) VALUES ($1, $2, $3, $4)",
        [sessionId, nextTiebreak, question.id, session.tiebreak_participant_ids]
      );
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'QUESTION_READY',
             tiebreak_round = $2,
             current_question_id = $3,
             current_category_id = $4,
             reading_start_time = NULL,
             answering_start_time = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId, nextTiebreak, question.id, question.category_id]
      );
      summary = `Lanzó la pregunta de desempate ${nextTiebreak}${question.is_tiebreaker ? "" : " (del banco general: no quedaban de desempate)"}`;
      break;
    }
    case "RESET_GAME": {
      if (session.status === "ROUND_RANKING") {
        const { relevantTies } = await getYambolyRanking(sessionId, pool);
        if (session.current_round < session.total_rounds || session.tiebreak_round < session.max_tiebreak_questions || !relevantTies.length) {
          throw new Error("El reinicio solo está disponible en el lobby, el podio o tras alcanzar el límite con empate pendiente.");
        }
      }
      await pool.query("DELETE FROM yamboly_tiebreak_answers WHERE session_id = $1", [sessionId]);
      await pool.query("DELETE FROM yamboly_tiebreak_rounds WHERE session_id = $1", [sessionId]);
      await pool.query(
        `UPDATE yamboly_sessions
         SET status = 'WAITING_REGISTRATION',
             current_round = 0,
             current_category_id = NULL,
             current_question_id = NULL,
             reading_start_time = NULL,
             answering_start_time = NULL,
             is_registration_open = TRUE,
             paused_at = NULL,
             tiebreak_round = 0,
             tiebreak_participant_ids = '{}',
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      await pool.query("UPDATE yamboly_questions SET used = FALSE");
      await pool.query("DELETE FROM yamboly_answers WHERE session_id = $1", [sessionId]);
      if (action.clearParticipants === true) {
        // Sus celulares vuelven al formulario de registro: el token guardado ya no corresponde a nadie.
        const removed = await pool.query("DELETE FROM yamboly_participants WHERE session_id = $1", [sessionId]);
        summary = `Reinició la partida y borró ${removed.rowCount ?? 0} inscrito${removed.rowCount === 1 ? "" : "s"}`;
      } else {
        await pool.query("UPDATE yamboly_participants SET score = 0, correct_count = 0, total_response_time_ms = 0 WHERE session_id = $1", [sessionId]);
      }
      break;
    }
  }

  await logYambolyAudit(pool, {
    sessionId,
    actor,
    action: `MODERADOR_${action.type}`,
    entityType: "session",
    entityId: sessionId,
    summary,
    duringGame: isGameStarted(session),
  });

  const updated = (await pool.query("SELECT * FROM yamboly_sessions WHERE id = $1", [sessionId])).rows[0];
  await pool.query("COMMIT");
  return updated;
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally { pool.release(); }
}
