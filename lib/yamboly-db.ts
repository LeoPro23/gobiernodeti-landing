import "server-only";
import { getPool } from "./db";
import { randomBytes } from "node:crypto";

let yambolyEnsured = false;

export async function ensureYambolyTables() {
  if (yambolyEnsured) return;
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
  `;

  await pool.query(query);

  // Seed default session if not exists
  await pool.query(`
    INSERT INTO yamboly_sessions (id, status, current_round, total_rounds)
    VALUES ('fullday', 'WAITING_REGISTRATION', 0, 5)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Seed default prizes
  await pool.query(`
    INSERT INTO yamboly_prizes (session_id, place, title, description, image_url)
    VALUES 
      ('fullday', 1, '1er Puesto: Super Pack Yámboly Campeón', 'Pack familiar de helados y postres Yámboly + merchandising oficial + diploma de excelencia', '/images/yamboly/premio-1.webp'),
      ('fullday', 2, '2do Puesto: Pack Yámboly Silver', 'Pack surtido premium de helados Yámboly + merchandising', '/images/yamboly/premio-2.webp'),
      ('fullday', 3, '3er Puesto: Pack Yámboly Bronze', 'Caja degustación de helados Yámboly', '/images/yamboly/premio-3.webp')
    ON CONFLICT (session_id, place) DO NOTHING;
  `);

  // Seed default categories and questions if none exist
  const catCount = await pool.query("SELECT COUNT(*) FROM yamboly_categories");
  if (parseInt(catCount.rows[0].count, 10) === 0) {
    await seedInitialQuizData(pool);
  }

  yambolyEnsured = true;
}

// Initial seed data based on the congress themes
async function seedInitialQuizData(pool: any) {
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
  pool: any,
  categoryId: number,
  q: { text: string; options: any[]; correct: string; difficulty: string }
) {
  await pool.query(
    `INSERT INTO yamboly_questions (category_id, text, options, correct_option_id, difficulty)
     VALUES ($1, $2, $3, $4, $5)`,
    [categoryId, q.text, JSON.stringify(q.options), q.correct, q.difficulty]
  );
}

// ----------------- Data Access Functions -----------------

export async function getYambolySession(sessionId = "fullday") {
  await ensureYambolyTables();
  const res = await getPool().query(
    "SELECT * FROM yamboly_sessions WHERE id = $1",
    [sessionId]
  );
  return res.rows[0] || null;
}

export async function getYambolyCategories() {
  await ensureYambolyTables();
  const res = await getPool().query(
    "SELECT * FROM yamboly_categories ORDER BY id ASC"
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
    `SELECT q.id, q.category_id, q.text, q.options, q.difficulty, q.correct_option_id,
            c.name as category_name, c.color as category_color
     FROM yamboly_questions q
     JOIN yamboly_categories c ON q.category_id = c.id
     WHERE q.id = $1`,
    [questionId]
  );
  return res.rows[0] || null;
}

export async function getYambolyParticipantsCount(sessionId = "fullday") {
  await ensureYambolyTables();
  const res = await getPool().query(
    "SELECT COUNT(*) as count FROM yamboly_participants WHERE session_id = $1",
    [sessionId]
  );
  return parseInt(res.rows[0]?.count || "0", 10);
}

export async function getYambolyLeaderboard(sessionId = "fullday", limit = 10) {
  await ensureYambolyTables();
  const res = await getPool().query(
    `SELECT p.id, p.full_name, p.score, p.correct_count, p.total_response_time_ms,
       COUNT(*) FILTER (WHERE a.is_correct AND q.difficulty = 'DIFICIL')::int AS difficult_correct,
       COUNT(*) FILTER (WHERE a.is_correct AND q.difficulty = 'INTERMEDIA')::int AS intermediate_correct
     FROM yamboly_participants p
     LEFT JOIN yamboly_answers a ON a.participant_id = p.id
     LEFT JOIN yamboly_questions q ON q.id = a.question_id
     WHERE p.session_id = $1
     GROUP BY p.id
     ORDER BY p.score DESC, difficult_correct DESC, intermediate_correct DESC, p.total_response_time_ms ASC, p.id ASC
     LIMIT $2`,
    [sessionId, limit]
  );
  return res.rows;
}

export async function getYambolyPrizes(sessionId = "fullday") {
  await ensureYambolyTables();
  const res = await getPool().query(
    "SELECT * FROM yamboly_prizes WHERE session_id = $1 ORDER BY place ASC",
    [sessionId]
  );
  return res.rows;
}

export async function registerYambolyParticipant(data: {
  sessionId?: string;
  fullName: string;
  email: string;
  phone: string;
}) {
  await ensureYambolyTables();
  const sessionId = data.sessionId || "fullday";
  // Format and validate
  const fullName = data.fullName.trim();
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim();

  if (!fullName || fullName.length < 3) throw new Error("Por favor ingresa tu nombre completo.");
  if (fullName.length > 200) throw new Error("El nombre es demasiado largo.");
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingresa un correo válido.");
  if (phone.length > 50 || !/^[+\d\s()-]{6,50}$/.test(phone) || phone.replace(/\D/g, "").length < 6) throw new Error("Ingresa un número de teléfono válido.");

  // Create token
  const token = randomBytes(32).toString("hex");

  const client = await getPool().connect();
  try {
  await client.query("BEGIN");
  const session = (await client.query("SELECT * FROM yamboly_sessions WHERE id = $1 FOR UPDATE", [sessionId])).rows[0];
  if (!session) throw new Error("Sesión no encontrada");
  if (!session.is_registration_open && !session.allow_late_entry) throw new Error("El registro para esta dinámica ya fue cerrado por el moderador.");
  const existing = await client.query("SELECT 1 FROM yamboly_participants WHERE session_id = $1 AND lower(email) = $2 LIMIT 1", [sessionId, email]);
  if (existing.rowCount) throw new Error("Este correo ya está inscrito. Usa el navegador con el que te registraste o consulta a la organización.");
  const res = await client.query(
    `INSERT INTO yamboly_participants (session_id, full_name, email, phone, token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, token, full_name, email, phone, score, correct_count`,
    [sessionId, fullName, email, phone, token]
  );

  await client.query("COMMIT");
  return res.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
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
  const session = sessionResult.rows[0];
  if (!session) throw new Error("Sesión no activa.");

  if (session.paused_at) throw new Error("La partida está pausada.");

  if (session.status !== "QUESTION_ANSWERING") {
    throw new Error("El tiempo de respuesta para esta pregunta no está activo.");
  }

  if (session.current_question_id !== data.questionId) {
    throw new Error("La pregunta respondida no coincide con la ronda activa.");
  }

  // Calculate elapsed time from answering_start_time
  const startTime = session.answering_start_time ? new Date(session.answering_start_time).getTime() : Date.now();
  const responseTimeMs = Math.max(0, Date.now() - startTime);
  if (!session.answering_start_time || responseTimeMs >= session.answering_duration_sec * 1000) {
    throw new Error("El tiempo de respuesta ha terminado.");
  }

  // Check if already answered
  const existingAnswer = await client.query(
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
  
  const correctOption = qRes.rows[0].correct_option_id;
  if (!qRes.rows[0].options.some((option: { id: string }) => option.id === data.selectedOptionId.trim().toUpperCase())) {
    throw new Error("La alternativa seleccionada no es válida.");
  }
  const isCorrect = data.selectedOptionId.trim().toUpperCase() === correctOption.toUpperCase();

  // Points rule: 4 points per correct answer, 0 for error
  const pointsAwarded = isCorrect ? 4 : 0;

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
      data.selectedOptionId.trim().toUpperCase(),
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

export async function executeModeratorAction(action: {
  sessionId?: string;
  type: 
    | "OPEN_REGISTRATION"
    | "CLOSE_REGISTRATION"
    | "SPIN_ROULETTE"
    | "START_READING"
    | "START_ANSWERING"
    | "REVEAL_ANSWER"
    | "SHOW_ROUND_RANKING"
    | "SHOW_PODIUM"
    | "RESET_GAME" | "PAUSE" | "RESUME";
  categoryId?: number;
  questionId?: number;
}) {
  await ensureYambolyTables();
  const sessionId = action.sessionId || "fullday";
  const pool = await getPool().connect();
  try {
  await pool.query("BEGIN");
  const session = (await pool.query("SELECT * FROM yamboly_sessions WHERE id = $1 FOR UPDATE", [sessionId])).rows[0];
  if (!session) throw new Error("Sesión no encontrada.");

  const allowed: Record<string, string[]> = {
    OPEN_REGISTRATION: ["WAITING_REGISTRATION"], CLOSE_REGISTRATION: ["WAITING_REGISTRATION"],
    SPIN_ROULETTE: ["WAITING_REGISTRATION", "ROUND_RANKING"], START_READING: ["ROULETTE"],
    START_ANSWERING: ["QUESTION_READING"], REVEAL_ANSWER: ["QUESTION_ANSWERING"],
    SHOW_ROUND_RANKING: ["QUESTION_REVEAL"], SHOW_PODIUM: ["ROUND_RANKING"],
    RESET_GAME: ["WAITING_REGISTRATION", "PODIUM"],
    PAUSE: ["ROULETTE", "QUESTION_READING", "QUESTION_ANSWERING", "QUESTION_REVEAL", "ROUND_RANKING"],
    RESUME: ["ROULETTE", "QUESTION_READING", "QUESTION_ANSWERING", "QUESTION_REVEAL", "ROUND_RANKING"],
  };
  if (!allowed[action.type]?.includes(session.status)) throw new Error("Acción no permitida en esta etapa.");
  if (session.paused_at && action.type !== "RESUME") throw new Error("Reanuda la partida antes de continuar.");
  if (!session.paused_at && action.type === "RESUME") throw new Error("La partida no está pausada.");
  if (action.type === "SPIN_ROULETTE" && session.current_round >= session.total_rounds) throw new Error("La partida ya completó sus rondas.");
  if (action.type === "SHOW_PODIUM" && session.current_round < session.total_rounds) throw new Error("Aún quedan rondas por jugar.");

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
      // Pick next category and an unused question
      if (session.current_round === 0) {
        const counts = await pool.query(
          `SELECT difficulty, COUNT(*)::int AS count FROM yamboly_questions WHERE used = FALSE GROUP BY difficulty`
        );
        const available = new Map<string, number>(counts.rows.map((row: { difficulty: string; count: number }) => [row.difficulty, row.count]));
        if ((available.get("FACIL") || 0) < 1 || (available.get("INTERMEDIA") || 0) < 2 || (available.get("DIFICIL") || 0) < 2) {
          throw new Error("Se requieren preguntas disponibles: 1 fácil, 2 intermedias y 2 difíciles.");
        }
      }
      const difficulty = ["FACIL", "INTERMEDIA", "INTERMEDIA", "DIFICIL", "DIFICIL"][session.current_round];
      if (!difficulty) throw new Error("No hay dificultad configurada para esta ronda.");
      let chosenCatId = action.categoryId;
      if (!chosenCatId) {
        // Pick random category that has unused questions
        const catRes = await pool.query(
          `SELECT c.id FROM yamboly_categories c
           WHERE EXISTS (SELECT 1 FROM yamboly_questions q WHERE q.category_id = c.id AND q.used = FALSE AND q.difficulty = $1)
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
        `SELECT id FROM yamboly_questions 
         WHERE category_id = $1 AND used = FALSE AND difficulty = $2
         ORDER BY RANDOM() LIMIT 1`,
        [chosenCatId, difficulty]
      );

      let questionId = qRes.rows[0]?.id;
      if (!questionId) {
        throw new Error("La categoría no tiene preguntas elegibles para esta ronda.");
      }

      if (questionId) {
        await pool.query("UPDATE yamboly_questions SET used = TRUE WHERE id = $1", [questionId]);
      }

      const nextRound = session.current_round + 1;

      await pool.query(
        `UPDATE yamboly_sessions 
         SET status = 'ROULETTE',
             current_round = $1,
             current_category_id = $2,
             current_question_id = $3,
             is_registration_open = FALSE,
             updated_at = NOW()
         WHERE id = $4`,
        [nextRound, chosenCatId, questionId, sessionId]
      );
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
      const ranking = await getYambolyLeaderboard(sessionId, 2147483647);
      for (let i = 0; i < Math.min(3, ranking.length - 1); i++) {
        const a = ranking[i], b = ranking[i + 1];
        if (a.score === b.score && a.difficult_correct === b.difficult_correct &&
            a.intermediate_correct === b.intermediate_correct &&
            Math.abs(a.total_response_time_ms - b.total_response_time_ms) < 1000) {
          throw new Error("Hay un empate técnico que afecta el podio; debe resolverse antes de publicar ganadores.");
        }
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
    case "RESET_GAME": {
      await pool.query(
        `UPDATE yamboly_sessions 
         SET status = 'WAITING_REGISTRATION',
             current_round = 0,
             current_category_id = NULL,
             current_question_id = NULL,
             reading_start_time = NULL,
             answering_start_time = NULL,
             is_registration_open = TRUE,
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      await pool.query("UPDATE yamboly_questions SET used = FALSE");
      await pool.query("DELETE FROM yamboly_answers WHERE session_id = $1", [sessionId]);
      await pool.query("UPDATE yamboly_participants SET score = 0, correct_count = 0, total_response_time_ms = 0 WHERE session_id = $1", [sessionId]);
      break;
    }
  }

  const updated = (await pool.query("SELECT * FROM yamboly_sessions WHERE id = $1", [sessionId])).rows[0];
  await pool.query("COMMIT");
  return updated;
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally { pool.release(); }
}
