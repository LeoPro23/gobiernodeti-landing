// Partida completa contra un PostgreSQL real (local). Se omite si no se define
// YAMBOLY_TEST_DATABASE_URL. Borra las tablas del quiz: nunca apuntarla a una base compartida.
//   YAMBOLY_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5544/postgres pnpm test
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
    await admin.updateGameSettings({ readingDurationSec: 8, answeringDurationSec: 20, pointsPerCorrect: 5, tieThresholdMs: 1000, difficultySequence: ["FACIL", "INTERMEDIA", "DIFICIL"], allowLateEntry: false }, "test@fullday")
    const categoryId = (await db.getYambolyCategories())[0].id
    await admin.createQuestion(categoryId, { text: "¿Pregunta de desempate?", options: [{ id: "A", text: "Sí" }, { id: "B", text: "No" }], correctOptionId: "A", difficulty: "DIFICIL", isTiebreaker: true }, "test@fullday")
    for (const name of ["Ana", "Beto", "Caro", "Dani"]) {
      const p = await db.registerYambolyParticipant({ fullName: name, email: `${name}@test.pe`, phone: "987654321" })
      players.push({ id: p.id, token: p.token })
    }
    const current = await session()
    expect(current).toMatchObject({ points_per_correct: 5, total_rounds: 3, difficulty_sequence: ["FACIL", "INTERMEDIA", "DIFICIL"] })
  })

  it("juega las rondas: la pregunta de desempate nunca sale en la ruleta", async () => {
    for (let roundIndex = 0; roundIndex < 3; roundIndex++) {
      await act("SPIN_ROULETTE")
      const q = await correctOption()
      expect((await pool.query("SELECT is_tiebreaker FROM yamboly_questions WHERE id = $1", [q.questionId])).rows[0].is_tiebreaker).toBe(false)
      await act("START_READING")
      await act("START_ANSWERING")
      // Ana y Beto aciertan casi al mismo tiempo; Caro falla; Dani no responde.
      await answer(0, q.questionId, q.correct)
      await answer(1, q.questionId, q.correct)
      await answer(2, q.questionId, q.wrong)
      await act("REVEAL_ANSWER")
      await act("SHOW_ROUND_RANKING")
    }
    const { ranking } = await db.getYambolyRanking()
    expect(ranking.slice(0, 2).map(r => r.score)).toEqual([15, 15])
  })

  it("bloquea reglas y preguntas jugadas una vez iniciada la partida", async () => {
    await expect(admin.updateGameSettings({ readingDurationSec: 5, answeringDurationSec: 20, pointsPerCorrect: 5, tieThresholdMs: 1000, difficultySequence: ["FACIL"], allowLateEntry: false }, "x")).rejects.toThrow("bloqueadas")
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
    await act("START_ANSWERING")
    await answer(1, q.questionId, q.correct) // Beto acierta
    await answer(0, q.questionId, q.wrong) // Ana falla
    await answer(2, q.questionId, q.correct) // Caro acierta; Dani no responde
    await expect(answer(1, q.questionId, q.correct)).rejects.toThrow("Ya enviaste")
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
    await act("SPIN_ROULETTE"); await act("START_READING"); await act("START_ANSWERING")
    const q = await correctOption()
    await answer(0, q.questionId, q.correct)
    await answer(1, q.questionId, q.correct)
    await act("REVEAL_ANSWER"); await act("SHOW_ROUND_RANKING"); await act("PREPARE_TIEBREAK")
    expect((await session()).tiebreak_participant_ids.sort()).toEqual([players[0].id, players[1].id].sort())
    await act("START_TIEBREAK_QUESTION"); await act("START_ANSWERING")
    const tb = await correctOption()
    await expect(answer(3, tb.questionId, tb.correct)).rejects.toThrow("solo para los participantes empatados")
  })

  it("registra el historial de cambios y acciones", async () => {
    const actions = (await pool.query("SELECT action FROM yamboly_audit_log")).rows.map(r => r.action)
    expect(actions).toEqual(expect.arrayContaining(["PARAMETROS_ACTUALIZADOS", "PREGUNTA_CREADA", "PREMIO_EDITADO", "MODERADOR_PREPARE_TIEBREAK", "MODERADOR_RESET_GAME"]))
  })
})
