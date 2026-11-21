// Partida completa contra un PostgreSQL real (local). Se omite si no se define
// YAMBOLY_TEST_DATABASE_URL. Borra las tablas del quiz: nunca apuntarla a una base compartida.
//   YAMBOLY_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5544/postgres pnpm test --no-file-parallelism
// (en serie: con una base en memoria como PGlite, dos archivos escribiendo a la vez se bloquean).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const url = process.env.YAMBOLY_TEST_DATABASE_URL
const isLocal = url ? ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname) : false
if (url && !isLocal) throw new Error("YAMBOLY_TEST_DATABASE_URL debe apuntar a localhost: este test borra las tablas del quiz.")

describe.skipIf(!url)("Yámboly contra PostgreSQL", () => {
  let db: typeof import("@/lib/yamboly-db")
  let admin: typeof import("@/lib/yamboly-admin")
  let pool: import("pg").Pool
  const players: { id: number; token: string }[] = []

  const act = (type: Parameters<typeof db.executeModeratorAction>[0]["type"]) => db.executeModeratorAction({ type }, "test@fullday")
  const session = async () => (await db.getYambolySession())!
  const finishReading = () => pool.query("UPDATE yamboly_sessions SET reading_start_time = clock_timestamp() - (reading_duration_sec * interval '1 second') WHERE id = 'fullday'")
  const finishAnswering = () => pool.query("UPDATE yamboly_sessions SET answering_start_time = clock_timestamp() - (answering_duration_sec * interval '1 second') WHERE id = 'fullday'")
  const correctOption = async () => {
    const current = await session()
    const row = (await pool.query("SELECT correct_option_id, options FROM yamboly_questions WHERE id = $1", [current.current_question_id])).rows[0]
    const wrong = row.options.find((option: { id: string }) => option.id !== row.correct_option_id).id
    return { questionId: current.current_question_id!, correct: row.correct_option_id as string, wrong: wrong as string }
  }
  const answer = (player: number, questionId: number, option: string) =>
    db.submitYambolyAnswer({ token: players[player].token, questionId, selectedOptionId: option })

  beforeAll(async () => {
    process.env.DATABASE_URL = url
    const { Pool } = await import("pg")
    const setup = new Pool({ connectionString: url })
    await setup.query(`DROP TABLE IF EXISTS yamboly_audit_log, yamboly_tiebreak_answers, yamboly_tiebreak_rounds, yamboly_answers,
      yamboly_prizes, yamboly_participants, yamboly_questions, yamboly_categories, yamboly_sessions CASCADE`)
    await setup.end()
    db = await import("@/lib/yamboly-db")
    admin = await import("@/lib/yamboly-admin")
    pool = (await import("@/lib/db")).getPool()
    await db.ensureYambolyTables()
  })

  afterAll(async () => { await pool?.end() })

  it("prepara la partida: parámetros, pregunta de desempate y participantes", async () => {
    await admin.updateGameSettings({ readingDurationSec: 8, answeringDurationSec: 20, pointsPerCorrect: 5, tieThresholdMs: 1000, maxTiebreakQuestions: 3, difficultySequence: ["FACIL", "INTERMEDIA", "DIFICIL"], allowLateEntry: false }, "test@fullday")
    const categoryId = (await db.getYambolyCategories())[0].id
    await admin.createQuestion(categoryId, { text: "¿Pregunta de desempate?", options: [{ id: "A", text: "Sí" }, { id: "B", text: "No" }], correctOptionId: "A", difficulty: "DIFICIL", isTiebreaker: true }, "test@fullday")
    // Ana está inscrita en el Fullday: entra solo con su DNI. Los demás escriben nombre y correo.
    await pool.query("DELETE FROM registrations WHERE dni IN ('40000001', '40000002')")
    await pool.query(`INSERT INTO registrations (nombres, apellidos, dni, universidad, carrera, ciclo)
      VALUES ('Ana', 'Torres Ruiz', '40000001', 'UNT', 'Sistemas', 'X'), ('Luis', 'Gómez', '40000002', 'UNT', 'Sistemas', 'X')`)
    const ana = await db.registerYambolyParticipant({ dni: "40000001", fullName: "Otro nombre", email: "otro@test.pe" })
    expect(ana).toMatchObject({ full_name: "Ana Torres Ruiz", email: null, dni: "40000001" })
    players.push({ id: ana.id, token: ana.token })
    for (const [i, name] of ["Beto", "Caro", "Dani"].entries()) {
      const p = await db.registerYambolyParticipant({ dni: `5000000${i}`, fullName: name, email: `${name}@test.pe` })
      players.push({ id: p.id, token: p.token })
    }
    const current = await session()
    expect(current).toMatchObject({ points_per_correct: 5, total_rounds: 3, difficulty_sequence: ["FACIL", "INTERMEDIA", "DIFICIL"] })
  })

  it("registro con DNI: confirma el nombre del Fullday y evita duplicados", async () => {
    expect(await db.lookupYambolyDni("40000002")).toEqual({ found: true, fullName: "Luis Gómez" })
    expect(await db.lookupYambolyDni("49999999")).toEqual({ found: false })
    await expect(db.lookupYambolyDni("40000001")).rejects.toThrow("ya está inscrito")
    await expect(db.lookupYambolyDni("123")).rejects.toThrow("DNI válido")
    await expect(db.registerYambolyParticipant({ dni: "50000000", fullName: "Beto bis", email: "x@test.pe" })).rejects.toThrow("DNI ya está inscrito")
    await expect(db.registerYambolyParticipant({ dni: "50000009", fullName: "Beto bis", email: "BETO@test.pe" })).rejects.toThrow("correo ya está inscrito")
    await expect(db.registerYambolyParticipant({ dni: "50000009", fullName: "Sin correo" })).rejects.toThrow("Ingresa un correo")
  })

  it("consola del moderador: lista y busca inscritos, y corrige nombres con historial", async () => {
    const all = await admin.listQuizParticipants()
    expect(all).toHaveLength(4)
    expect(all.find(p => p.dni === "40000001")).toMatchObject({ full_name: "Ana Torres Ruiz", from_fullday: true, email: null })
    expect((await admin.listQuizParticipants("beto@")).map(p => p.full_name)).toEqual(["Beto"])
    expect((await admin.listQuizParticipants("5000000")).length).toBe(3)

    const beto = all.find(p => p.full_name === "Beto")!
    expect(await admin.renameParticipant(beto.id, "  Beto   Ruiz ", "test@fullday")).toBe(true)
    expect(await admin.renameParticipant(beto.id, "Beto Ruiz", "test@fullday")).toBe(false)
    await expect(admin.renameParticipant(beto.id, "B", "test@fullday")).rejects.toThrow("nombres y apellidos")
    expect((await pool.query("SELECT full_name FROM yamboly_participants WHERE id = $1", [beto.id])).rows[0].full_name).toBe("Beto Ruiz")
    const renamed = (await pool.query("SELECT details FROM yamboly_audit_log WHERE action = 'INSCRITO_RENOMBRADO'")).rows
    expect(renamed.map(r => r.details)).toEqual([{ antes: "Beto", despues: "Beto Ruiz" }])
  })

  it("juega las rondas: la pregunta de desempate nunca sale en la ruleta", async () => {
    for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
      await act("SPIN_ROULETTE")
      const q = await correctOption()
      expect((await pool.query("SELECT is_tiebreaker FROM yamboly_questions WHERE id = $1", [q.questionId])).rows[0].is_tiebreaker).toBe(false)
      await expect(act("START_READING")).rejects.toThrow("no permitida")
      await act("SHOW_QUESTION")
      expect(await session()).toMatchObject({ status: "QUESTION_READY", reading_start_time: null })
      await expect(answer(0, q.questionId, q.correct)).rejects.toThrow("no está activo")
      await act("START_READING")
      await expect(act("START_ANSWERING")).rejects.toThrow("lectura aún no ha terminado")
      if (roundIndex === 0) {
        await act("PAUSE")
        await expect(act("START_ANSWERING")).rejects.toThrow("Reanuda")
        await act("RESUME")
      }
      await finishReading()
      await act("START_ANSWERING")
      // Ana y Beto aciertan casi al mismo tiempo; Caro falla; Dani no responde.
      await answer(0, q.questionId, q.correct)
      await answer(1, q.questionId, q.correct)
      await answer(2, q.questionId, q.wrong)
      if (roundIndex === 0) {
        await act("PAUSE")
        await expect(answer(3, q.questionId, q.correct)).rejects.toThrow("pausada")
        await act("RESUME")
        expect((await pool.query("SELECT COUNT(*)::int AS n FROM yamboly_answers WHERE question_id = $1", [q.questionId])).rows[0].n).toBe(3)
      }
      await expect(act("REVEAL_ANSWER")).rejects.toThrow("votación aún no ha terminado")
      await finishAnswering()
      await expect(answer(3, q.questionId, q.correct)).rejects.toThrow("tiempo de respuesta ha terminado")
      await act("REVEAL_ANSWER")
      await act("SHOW_ROUND_RANKING")
    }
    const { ranking } = await db.getYambolyRanking()
    expect(ranking.slice(0, 2).map(r => r.score)).toEqual([15, 15])
  })

  it("bloquea reglas y preguntas jugadas una vez iniciada la partida", async () => {
    await expect(admin.updateGameSettings({ readingDurationSec: 5, answeringDurationSec: 20, pointsPerCorrect: 5, tieThresholdMs: 1000, maxTiebreakQuestions: 3, difficultySequence: ["FACIL"], allowLateEntry: false }, "x")).rejects.toThrow("bloqueadas")
    const played = (await pool.query("SELECT id FROM yamboly_questions WHERE used = TRUE LIMIT 1")).rows[0].id
    await expect(admin.setQuestionActive(played, false, "x")).rejects.toThrow("ya se jugó")
    await expect(admin.deleteLastPrize("x")).rejects.toThrow("ya comenzó")
    await admin.updatePrize(1, { title: "Pack campeón", description: "", imageUrl: "", units: 2, conditions: "" }, "x")
    const last = (await pool.query("SELECT during_game, summary FROM yamboly_audit_log ORDER BY id DESC LIMIT 1")).rows[0]
    expect(last).toMatchObject({ during_game: true })
  })

  it("no publica el podio con empate técnico y desempata a los afectados", async () => {
    await expect(act("SHOW_PODIUM")).rejects.toThrow("empate técnico")
    // Ana y Beto empatan en 1.º–2.º; Caro y Dani, sin puntos, en 3.º–4.º (el 3.º tiene premio).
    const before = await db.getYambolyRanking()
    expect(before.relevantTies.map(g => [g.fromPosition, g.toPosition])).toEqual([[1, 2], [3, 4]])

    await act("PREPARE_TIEBREAK")
    const contenders = (await session()).tiebreak_participant_ids
    expect([...contenders].sort()).toEqual(players.map(p => p.id).sort())

    await act("START_TIEBREAK_QUESTION")
    const q = await correctOption()
    expect((await pool.query("SELECT is_tiebreaker FROM yamboly_questions WHERE id = $1", [q.questionId])).rows[0].is_tiebreaker).toBe(true)
    expect(await session()).toMatchObject({ status: "QUESTION_READY", reading_start_time: null })
    await act("START_READING"); await finishReading()
    await act("START_ANSWERING")
    await answer(1, q.questionId, q.correct) // Beto acierta
    await answer(0, q.questionId, q.wrong) // Ana falla
    await answer(2, q.questionId, q.correct) // Caro acierta; Dani no responde
    await expect(answer(1, q.questionId, q.correct)).rejects.toThrow("Ya enviaste")
    await finishAnswering()
    await act("REVEAL_ANSWER")
    await act("SHOW_ROUND_RANKING")

    const after = await db.getYambolyRanking()
    expect(after.ranking.map(r => r.id)).toEqual([players[1].id, players[0].id, players[2].id, players[3].id])
    expect(after.relevantTies).toEqual([])
    // El desempate no suma puntos.
    expect(after.ranking.slice(0, 2).map(r => r.score)).toEqual([15, 15])
    await act("SHOW_PODIUM")
    expect((await session()).status).toBe("PODIUM")
  })

  it("rechaza respuestas de desempate de quien no está empatado", async () => {
    await act("RESET_GAME")
    const reset = await session()
    expect(reset).toMatchObject({ status: "WAITING_REGISTRATION", tiebreak_round: 0, tiebreak_participant_ids: [] })
    expect((await pool.query("SELECT COUNT(*)::int AS n FROM yamboly_tiebreak_rounds")).rows[0].n).toBe(0)

    // Partida de una sola ronda donde solo Ana y Beto empatan arriba.
    await pool.query("UPDATE yamboly_sessions SET difficulty_sequence = ARRAY['FACIL'], total_rounds = 1")
    await pool.query("DELETE FROM yamboly_prizes WHERE place > 1")
    await act("SPIN_ROULETTE"); await act("SHOW_QUESTION"); await act("START_READING"); await finishReading(); await act("START_ANSWERING")
    const q = await correctOption()
    await answer(0, q.questionId, q.correct)
    await answer(1, q.questionId, q.correct)
    await finishAnswering(); await act("REVEAL_ANSWER"); await act("SHOW_ROUND_RANKING"); await act("PREPARE_TIEBREAK")
    expect((await session()).tiebreak_participant_ids.sort()).toEqual([players[0].id, players[1].id].sort())
    await act("START_TIEBREAK_QUESTION"); await act("START_READING"); await finishReading(); await act("START_ANSWERING")
    const tb = await correctOption()
    await expect(answer(3, tb.questionId, tb.correct)).rejects.toThrow("solo para los participantes empatados")
    // Durante el desempate no se aceptan inscripciones.
    await expect(db.registerYambolyParticipant({ dni: "70000000", fullName: "Tarde", email: "tarde@test.pe" })).rejects.toThrow()
  })

  it("registra el historial de cambios y acciones", async () => {
    const actions = (await pool.query("SELECT action FROM yamboly_audit_log")).rows.map(r => r.action)
    expect(actions).toEqual(expect.arrayContaining(["PARAMETROS_ACTUALIZADOS", "PREGUNTA_CREADA", "PREMIO_EDITADO", "MODERADOR_PREPARE_TIEBREAK", "MODERADOR_RESET_GAME", "INSCRITO_RENOMBRADO"]))
  })

  it("detiene el desempate en el límite y conserva el grupo empatado para sorteo", async () => {
    for (let roundIndex = 1; roundIndex <= 3; roundIndex++) {
      const q = await correctOption()
      await answer(0, q.questionId, q.wrong)
      await answer(1, q.questionId, q.wrong)
      await finishAnswering(); await act("REVEAL_ANSWER"); await act("SHOW_ROUND_RANKING")
      if (roundIndex < 3) {
        await act("PREPARE_TIEBREAK"); await act("START_TIEBREAK_QUESTION"); await act("START_READING"); await finishReading(); await act("START_ANSWERING")
      }
    }
    const result = await db.getYambolyRanking()
    expect(result.relevantTies[0].memberIds.sort()).toEqual([players[0].id, players[1].id].sort())
    await expect(act("PREPARE_TIEBREAK")).rejects.toThrow("límite")
    await expect(act("SHOW_PODIUM")).rejects.toThrow("empate técnico")
    await act("RESET_GAME")
    expect((await session()).status).toBe("WAITING_REGISTRATION")
  })

  it("reinicia la partida y, si se pide, borra a los inscritos", async () => {
    await pool.query("UPDATE yamboly_sessions SET status = 'PODIUM', paused_at = NULL")
    await db.executeModeratorAction({ type: "RESET_GAME" }, "test@fullday")
    expect((await pool.query("SELECT COUNT(*)::int AS n FROM yamboly_participants")).rows[0].n).toBe(4)

    await pool.query("UPDATE yamboly_sessions SET status = 'PODIUM'")
    await db.executeModeratorAction({ type: "RESET_GAME", clearParticipants: true }, "test@fullday")
    expect((await pool.query("SELECT COUNT(*)::int AS n FROM yamboly_participants")).rows[0].n).toBe(0)
    expect(await db.getParticipantByToken(players[0].token)).toBeNull()
    const last = (await pool.query("SELECT summary FROM yamboly_audit_log ORDER BY id DESC LIMIT 1")).rows[0]
    expect(last.summary).toContain("borró 4 inscritos")
  })
})
