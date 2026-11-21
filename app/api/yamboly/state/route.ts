import { NextRequest, NextResponse } from "next/server";
import {
  getYambolySession,
  getYambolyCategories,
  getYambolyCurrentQuestion,
  getYambolyParticipantsCount,
  getYambolyPrizes,
  getYambolyRanking,
  getParticipantByToken,
  SESSION_ID,
} from "@/lib/yamboly-db";
import { getPool } from "@/lib/db";
import { tiebreakOutcome } from "@/lib/yamboly-rules";

export const dynamic = "force-dynamic";

const REVEALED = ["QUESTION_REVEAL", "ROUND_RANKING", "PODIUM"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || req.cookies.get("yamboly_token")?.value;

    const session = await getYambolySession(SESSION_ID);
    if (!session) {
      return NextResponse.json({ error: "Sesión no disponible" }, { status: 404 });
    }

    const pool = getPool();
    const isTiebreak = session.tiebreak_round > 0 || session.status === "TIEBREAK";
    const finished = session.current_round >= session.total_rounds;
    const hideRanking = session.status === "QUESTION_ANSWERING";

    const [categories, participantsCount, prizes, rankingData, usedRes, remainingRes, contendersRes] = await Promise.all([
      getYambolyCategories({ activeOnly: true }),
      getYambolyParticipantsCount(SESSION_ID),
      getYambolyPrizes(SESSION_ID),
      hideRanking ? null : getYambolyRanking(SESSION_ID),
      // Preguntas jugadas en rondas normales (las de desempate se informan aparte).
      pool.query(
        `SELECT q.id, q.text, q.difficulty, c.name as category_name, c.color as category_color
         FROM yamboly_questions q
         JOIN yamboly_categories c ON q.category_id = c.id
         WHERE q.used = TRUE
           AND NOT EXISTS (SELECT 1 FROM yamboly_tiebreak_rounds r WHERE r.question_id = q.id AND r.session_id = $1)
         ORDER BY q.id ASC`,
        [SESSION_ID]
      ),
      pool.query(
        `SELECT c.id, c.name, COUNT(q.id) as remaining
         FROM yamboly_categories c
         LEFT JOIN yamboly_questions q ON q.category_id = c.id AND q.used = FALSE AND q.active = TRUE AND q.is_tiebreaker = FALSE
         WHERE c.active = TRUE
         GROUP BY c.id, c.name
         ORDER BY c.id ASC`
      ),
      isTiebreak && session.tiebreak_participant_ids.length
        ? pool.query("SELECT id, full_name FROM yamboly_participants WHERE id = ANY($1::int[])", [session.tiebreak_participant_ids])
        : null,
    ]);

    const ranking = rankingData?.ranking ?? [];
    const names = new Map(ranking.map((entry) => [entry.id, entry.full_name]));
    const relevantTies = (rankingData?.relevantTies ?? []).map((group) => ({
      fromPosition: group.fromPosition,
      toPosition: group.toPosition,
      participants: group.memberIds.map((id) => ({ id, full_name: names.get(id) ?? "" })),
    }));
    const outcome = tiebreakOutcome(rankingData?.tieGroups ?? [], rankingData?.prizePlaces ?? prizes.length, session.tiebreak_round, session.max_tiebreak_questions);
    const drawGroup = outcome.drawGroup;
    const drawPending = finished && session.status === "ROUND_RANKING" && Boolean(drawGroup);

    // Respuestas de la pregunta en pantalla: las de desempate se guardan aparte y no suman puntos.
    const answersTable = session.tiebreak_round > 0 ? "yamboly_tiebreak_answers" : "yamboly_answers";
    const answersWhere = session.tiebreak_round > 0 ? "session_id = $1 AND round = $2" : "question_id = $1";
    const answersParams: unknown[] = session.tiebreak_round > 0 ? [SESSION_ID, session.tiebreak_round] : [session.current_question_id];

    let currentQuestion: Record<string, unknown> | null = null;
    let answerStats: { selected_option_id: string; count: string }[] | null = null;
    let statsMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    let answeredCount = 0;

    if (session.current_question_id) {
      const q = await getYambolyCurrentQuestion(session.current_question_id);
      if (q) {
        const shouldReveal = REVEALED.includes(session.status);
        currentQuestion = {
          id: q.id,
          category_id: q.category_id,
          category_name: q.category_name,
          category_color: q.category_color,
          text: q.text,
          options: q.options,
          difficulty: q.difficulty,
          correct_option_id: shouldReveal ? q.correct_option_id : undefined,
          // La descripción de la respuesta también se envía solo al revelarla.
          explanation: shouldReveal ? q.explanation || null : undefined,
        };

        const countRes = await pool.query(
          `SELECT COUNT(DISTINCT participant_id) as count FROM ${answersTable} WHERE ${answersWhere}`,
          answersParams
        );
        answeredCount = Number(countRes.rows[0]?.count || 0);

        if (shouldReveal) {
          const statsRes = await pool.query(
            `SELECT selected_option_id, COUNT(*) as count FROM ${answersTable} WHERE ${answersWhere} GROUP BY selected_option_id`,
            answersParams
          );
          answerStats = statsRes.rows;
          statsRes.rows.forEach((r: any) => {
            statsMap[r.selected_option_id] = Number(r.count || 0);
          });
        }
      }
    }

    // Participant specific state
    let participant: Record<string, unknown> | null = null;
    let hasAnsweredCurrentQuestion = false;
    let participantCurrentAnswer: Record<string, unknown> | null = null;

    if (token) {
      const p = await getParticipantByToken(token);
      if (p) {
        const entry = ranking.find((item) => item.id === p.id);
        participant = {
          id: p.id,
          full_name: p.full_name,
          score: p.score,
          correct_count: p.correct_count,
          rank: hideRanking ? null : entry?.position ?? null,
          tied: Boolean(entry?.tie_group),
          is_tiebreak_contender: session.tiebreak_participant_ids.includes(p.id),
        };

        if (session.current_question_id) {
          const ansRes = await pool.query(
            session.tiebreak_round > 0
              ? `SELECT selected_option_id, is_correct, response_time_ms FROM yamboly_tiebreak_answers
                 WHERE session_id = $1 AND round = $2 AND participant_id = $3 LIMIT 1`
              : `SELECT selected_option_id, is_correct, response_time_ms FROM yamboly_answers
                 WHERE question_id = $1 AND participant_id = $2 LIMIT 1`,
            session.tiebreak_round > 0
              ? [SESSION_ID, session.tiebreak_round, p.id]
              : [session.current_question_id, p.id]
          );
          if (ansRes.rowCount && ansRes.rowCount > 0) {
            hasAnsweredCurrentQuestion = true;
            participantCurrentAnswer = REVEALED.includes(session.status)
              ? ansRes.rows[0]
              : { selected_option_id: ansRes.rows[0].selected_option_id };
            // No adelantar el resultado mientras la votación sigue abierta.
            if (session.status === "QUESTION_ANSWERING" && session.tiebreak_round === 0 && ansRes.rows[0].is_correct) {
              participant.score = p.score - session.points_per_correct;
              participant.correct_count = p.correct_count - 1;
            }
          }
        }
      }
    }

    const response = NextResponse.json({
      session,
      settings: {
        readingDurationSec: session.reading_duration_sec,
        answeringDurationSec: session.answering_duration_sec,
        pointsPerCorrect: session.points_per_correct,
        tieThresholdMs: session.tie_threshold_ms,
        maxTiebreakQuestions: session.max_tiebreak_questions,
        difficultySequence: session.difficulty_sequence,
      },
      categories,
      playedQuestions: usedRes.rows,
      remainingPerCategory: remainingRes.rows,
      currentQuestion,
      answerStats,
      answerStatsMap: statsMap,
      answeredCount,
      leaderboard: ranking.slice(0, 15),
      prizes,
      prizePlaces: rankingData?.prizePlaces ?? prizes.length,
      participantsCount: Number(participantsCount || 0),
      tiebreak: {
        active: isTiebreak,
        round: session.tiebreak_round,
        contenders: contendersRes?.rows ?? [],
        required: finished && relevantTies.length > 0,
        limitReached: outcome.limitReached,
        drawPending,
        drawParticipants: drawPending && drawGroup ? drawGroup.memberIds.map((id) => ({ id, full_name: names.get(id) ?? "" })) : [],
        groups: relevantTies,
      },
      participant,
      hasAnsweredCurrentQuestion,
      participantCurrentAnswer,
      serverTime: new Date().toISOString(),
    });

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return response;
  } catch (error) {
    console.error("Error in /api/yamboly/state:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener estado" },
      { status: 500 }
    );
  }
}
