import { describe, expect, it } from "vitest"
import {
  parseCsv,
  parseGameSettings,
  parseQuestionImport,
  rankParticipants,
  relevantTieGroups,
  requiredByDifficulty,
  validateQuestion,
  type RankInput,
  type TiebreakRoundResult,
} from "@/lib/yamboly-rules"

function player(id: number, score: number, timeMs: number, difficult = 0, intermediate = 0): RankInput {
  return { id, full_name: `P${id}`, score, correct_count: score / 4, total_response_time_ms: timeMs, difficult_correct: difficult, intermediate_correct: intermediate }
}

function round(n: number, contenderIds: number[], answers: Record<number, [boolean, number]>): TiebreakRoundResult {
  return { round: n, contenderIds, answers: new Map(Object.entries(answers).map(([id, [isCorrect, responseTimeMs]]) => [Number(id), { isCorrect, responseTimeMs }])) }
}

const order = (rows: RankInput[], rounds: TiebreakRoundResult[] = []) => rankParticipants(rows, rounds, 1000).ranking.map(r => r.id)

describe("clasificación del quiz", () => {
  it("ordena por puntos, aciertos difíciles, intermedios y tiempo", () => {
    const rows = [player(1, 12, 5000), player(2, 16, 9000), player(3, 12, 8000, 1), player(4, 12, 6000, 1, 1)]
    expect(order(rows)).toEqual([2, 4, 3, 1])
  })

  it("marca empate técnico si la diferencia de tiempo es menor al umbral", () => {
    const { ranking, tieGroups } = rankParticipants([player(1, 20, 10000), player(2, 20, 10900), player(3, 20, 12000)], [], 1000)
    expect(ranking.map(r => r.tie_group)).toEqual([1, 1, null])
    expect(tieGroups).toEqual([{ id: 1, fromPosition: 1, toPosition: 2, memberIds: [1, 2] }])
  })

  it("agrupa contra el mejor tiempo del grupo, sin encadenar diferencias", () => {
    // 0 s, 0,6 s y 1,2 s: el tercero está a más de 1 s del mejor del grupo.
    const { tieGroups } = rankParticipants([player(1, 8, 4000), player(2, 8, 4600), player(3, 8, 5200)], [], 1000)
    expect(tieGroups.map(g => g.memberIds)).toEqual([[1, 2]])
  })

  it("no considera empate a quienes difieren en aciertos por dificultad", () => {
    const { tieGroups } = rankParticipants([player(1, 8, 4000, 1), player(2, 8, 4000, 0, 1)], [], 1000)
    expect(tieGroups).toEqual([])
  })

  it("solo exige desempate si el grupo alcanza un puesto premiado", () => {
    const { tieGroups } = rankParticipants([player(1, 20, 1000), player(2, 16, 1000), player(3, 12, 1000), player(4, 8, 2000), player(5, 8, 2500)], [], 1000)
    expect(tieGroups[0]).toMatchObject({ fromPosition: 4, toPosition: 5 })
    expect(relevantTieGroups(tieGroups, 3)).toEqual([])
    expect(relevantTieGroups(tieGroups, 4)).toHaveLength(1)
  })

  it("un grupo que cruza el último puesto premiado es relevante", () => {
    const { tieGroups } = rankParticipants([player(1, 20, 1000), player(2, 16, 1000), player(3, 12, 3000), player(4, 12, 3500)], [], 1000)
    expect(relevantTieGroups(tieGroups, 3).map(g => g.memberIds)).toEqual([[3, 4]])
  })
})

describe("pregunta de desempate", () => {
  const tied = [player(1, 20, 10000), player(2, 20, 10300), player(3, 20, 10500)]

  it("gana quien acierta; entre quienes aciertan, el más rápido", () => {
    const tb = round(1, [1, 2, 3], { 1: [false, 2000], 2: [true, 6000], 3: [true, 3000] })
    const { ranking, tieGroups } = rankParticipants(tied, [tb], 1000)
    expect(ranking.map(r => r.id)).toEqual([3, 2, 1])
    expect(ranking.every(r => r.resolved_by_tiebreak)).toBe(true)
    expect(tieGroups).toEqual([])
  })

  it("quien no responde cuenta como incorrecto", () => {
    const tb = round(1, [1, 2, 3], { 3: [true, 9000] })
    const { ranking, tieGroups } = rankParticipants(tied, [tb], 1000)
    expect(ranking[0].id).toBe(3)
    expect(tieGroups.map(g => g.memberIds)).toEqual([[1, 2]])
  })

  it("si siguen empatados, la siguiente pregunta resuelve solo a los que quedaron", () => {
    const first = round(1, [1, 2, 3], { 1: [true, 4000], 2: [true, 4400], 3: [false, 1000] })
    const second = round(2, [1, 2], { 1: [false, 1000], 2: [true, 7000] })
    expect(order(tied, [first])).toEqual([1, 2, 3])
    expect(rankParticipants(tied, [first], 1000).tieGroups.map(g => g.memberIds)).toEqual([[1, 2]])
    expect(order(tied, [first, second])).toEqual([2, 1, 3])
    expect(rankParticipants(tied, [first, second], 1000).tieGroups).toEqual([])
  })

  it("resuelve varios grupos empatados con la misma pregunta", () => {
    const rows = [player(1, 20, 1000), player(2, 20, 1500), player(3, 12, 3000), player(4, 12, 3200)]
    const tb = round(1, [1, 2, 3, 4], { 2: [true, 2000], 1: [false, 0], 4: [true, 5000], 3: [true, 3000] })
    expect(order(rows, [tb])).toEqual([2, 1, 3, 4])
  })

  it("ignora preguntas en las que el grupo no participó completo", () => {
    const tb = round(1, [1, 2], { 1: [true, 1000], 2: [true, 5000] })
    // El jugador 3 no participó: el grupo de tres sigue empatado.
    expect(rankParticipants(tied, [tb], 1000).tieGroups.map(g => g.memberIds)).toEqual([[1, 2, 3]])
  })
})

describe("parámetros de partida", () => {
  const base = { readingDurationSec: "8", answeringDurationSec: "20", pointsPerCorrect: "4", tieThresholdMs: "1000", difficultySequence: ["FACIL", "", "DIFICIL", null], allowLateEntry: null }

  it("acepta valores válidos e ignora rondas vacías", () => {
    const parsed = parseGameSettings(base)
    expect(parsed).toEqual({ ok: true, value: { readingDurationSec: 8, answeringDurationSec: 20, pointsPerCorrect: 4, tieThresholdMs: 1000, difficultySequence: ["FACIL", "DIFICIL"], allowLateEntry: false } })
  })

  it("rechaza tiempos fuera de rango, decimales y dificultades desconocidas", () => {
    expect(parseGameSettings({ ...base, readingDurationSec: "1" }).ok).toBe(false)
    expect(parseGameSettings({ ...base, answeringDurationSec: "20.5" }).ok).toBe(false)
    expect(parseGameSettings({ ...base, difficultySequence: ["EXTREMA"] }).ok).toBe(false)
    expect(parseGameSettings({ ...base, difficultySequence: [] }).ok).toBe(false)
  })

  it("cuenta las preguntas necesarias por dificultad", () => {
    expect(requiredByDifficulty(["FACIL", "INTERMEDIA", "INTERMEDIA", "DIFICIL", "DIFICIL"])).toEqual({ FACIL: 1, INTERMEDIA: 2, DIFICIL: 2 })
  })
})

describe("validación de preguntas", () => {
  const ok = { text: "¿Qué entidad creó COBIT?", options: ["IEEE", "ISACA", "", ""], correctOptionId: "b", difficulty: "fácil", isTiebreaker: "si" }

  it("normaliza dificultad, respuesta y alternativas opcionales", () => {
    expect(validateQuestion(ok)).toEqual({ ok: true, value: { text: "¿Qué entidad creó COBIT?", options: [{ id: "A", text: "IEEE" }, { id: "B", text: "ISACA" }], correctOptionId: "B", difficulty: "FACIL", isTiebreaker: true } })
  })

  it("rechaza respuestas fuera de las alternativas, huecos y repetidas", () => {
    expect(validateQuestion({ ...ok, correctOptionId: "C" }).ok).toBe(false)
    expect(validateQuestion({ ...ok, options: ["IEEE", "", "ISO", ""] }).ok).toBe(false)
    expect(validateQuestion({ ...ok, options: ["ISACA", "isaca", "", ""] }).ok).toBe(false)
    expect(validateQuestion({ ...ok, difficulty: "media" }).ok).toBe(false)
  })
})

describe("importación CSV", () => {
  it("lee comillas, comas internas y punto y coma de Excel", () => {
    expect(parseCsv('a,b\n"uno, dos","con ""comillas"""\n')).toEqual([["a", "b"], ["uno, dos", 'con "comillas"']])
    expect(parseCsv("﻿a;b\r\n1;2")).toEqual([["a", "b"], ["1", "2"]])
  })

  it("importa filas válidas", () => {
    const csv = "Categoría;Dificultad;Pregunta;A;B;C;D;Correcta;Desempate\nRiesgos;DIFÍCIL;¿Qué es el riesgo?;Incertidumbre;Virus;;;A;sí"
    const parsed = parseQuestionImport(csv)
    expect(parsed).toMatchObject({ ok: true, questions: [{ category: "Riesgos", difficulty: "DIFICIL", correctOptionId: "A", isTiebreaker: true }] })
  })

  it("informa cada fila con error y no devuelve preguntas parciales", () => {
    const csv = "categoria,dificultad,pregunta,a,b,correcta\nX,FACIL,¿Pregunta válida?,1,2,A\nX,RARA,¿Otra pregunta?,1,2,A\n,FACIL,¿Sin categoría?,1,2,A\nX,FACIL,¿Pregunta válida?,1,2,B"
    const parsed = parseQuestionImport(csv)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.errors).toEqual([
        "Fila 3: Elige una dificultad válida.",
        "Fila 4: falta la categoría.",
        "Fila 5: pregunta repetida en el archivo (igual a la fila 2).",
      ])
    }
  })

  it("exige las columnas mínimas", () => {
    expect(parseQuestionImport("categoria,pregunta\nX,Y")).toEqual({ ok: false, errors: ["Faltan columnas: dificultad, a, b, correcta."] })
  })
})
