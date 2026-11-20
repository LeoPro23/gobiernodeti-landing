import { NextRequest, NextResponse } from "next/server";
import {
  getYambolySession,
  getYambolyCategories,
  getYambolyCurrentQuestion,
  getYambolyLeaderboard,
  getYambolyParticipantsCount,
  getYambolyPrizes,
  getParticipantByToken,
} from "@/lib/yamboly-db";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || req.cookies.get("yamboly_token")?.value;

    const session = await getYambolySession("fullday");
    if (!session) {
      return NextResponse.json({ error: "Sesión no disponible" }, { status: 404 });
    }

    const pool = getPool();
    const categories = await getYambolyCategories();
    const rawParticipantsCount = await getYambolyParticipantsCount("fullday");
    const participantsCount = Number(rawParticipantsCount || 0);
    const leaderboard = session.status === "QUESTION_ANSWERING" ? [] : await getYambolyLeaderboard("fullday", 15);
    const prizes = await getYambolyPrizes("fullday");

    // Fetch history of used questions
    const usedRes = await pool.query(
      `SELECT q.id, q.text, q.difficulty, c.name as category_name, c.color as category_color
       FROM yamboly_questions q
       JOIN yamboly_categories c ON q.category_id = c.id
       WHERE q.used = TRUE
       ORDER BY q.id ASC`
    );
    const playedQuestions = usedRes.rows;

    // Remaining questions count per category
    const remainingRes = await pool.query(
      `SELECT c.id, c.name, COUNT(q.id) as remaining
       FROM yamboly_categories c
       LEFT JOIN yamboly_questions q ON q.category_id = c.id AND q.used = FALSE
       GROUP BY c.id, c.name
       ORDER BY c.id ASC`
    );
    const remainingPerCategory = remainingRes.rows;

    let currentQuestion: any = null;
    let answerStats: any = null;
    let answeredCount = 0;

    if (session.current_question_id) {
      const q = await getYambolyCurrentQuestion(session.current_question_id);
      if (q) {
        const shouldReveal = ["QUESTION_REVEAL", "ROUND_RANKING", "PODIUM"].includes(session.status);
        currentQuestion = {
          id: q.id,
          category_id: q.category_id,
          category_name: q.category_name,
          category_color: q.category_color,
          text: q.text,
          options: q.options,
          difficulty: q.difficulty,
          correct_option_id: shouldReveal ? q.correct_option_id : undefined,
        };

        const countRes = await pool.query(
          "SELECT COUNT(DISTINCT participant_id) as count FROM yamboly_answers WHERE question_id = $1",
          [q.id]
        );
        answeredCount = Number(countRes.rows[0]?.count || 0);

        if (shouldReveal) {
          const statsRes = await pool.query(
            `SELECT selected_option_id, COUNT(*) as count 
             FROM yamboly_answers 
             WHERE question_id = $1 
             GROUP BY selected_option_id`,
            [q.id]
          );
          answerStats = statsRes.rows;
        }
      }
    }

    // Participant specific state
    let participant: any = null;
    let hasAnsweredCurrentQuestion = false;
    let participantCurrentAnswer: any = null;

    if (token) {
      const p = await getParticipantByToken(token);
      if (p) {
        // Calculate participant overall rank
        const allRanks = session.status === "QUESTION_ANSWERING" ? [] : await getYambolyLeaderboard(session.id, 2147483647);

        participant = {
          id: p.id,
          full_name: p.full_name,
          score: p.score,
          correct_count: p.correct_count,
          rank: allRanks.findIndex((entry: { id: number }) => entry.id === p.id) + 1,
        };

        if (session.current_question_id) {
          const ansRes = await pool.query(
            `SELECT selected_option_id, is_correct, response_time_ms 
             FROM yamboly_answers 
             WHERE participant_id = $1 AND question_id = $2 LIMIT 1`,
            [p.id, session.current_question_id]
          );
          if (ansRes.rowCount && ansRes.rowCount > 0) {
            hasAnsweredCurrentQuestion = true;
            participantCurrentAnswer = ["QUESTION_REVEAL", "ROUND_RANKING", "PODIUM"].includes(session.status)
              ? ansRes.rows[0]
              : { selected_option_id: ansRes.rows[0].selected_option_id };
            if (session.status === "QUESTION_ANSWERING" && ansRes.rows[0].is_correct) {
              participant.score -= 4;
              participant.correct_count -= 1;
            }
          }
        }
      }
    }

    return NextResponse.json({
      session,
      categories,
      playedQuestions,
      remainingPerCategory,
      currentQuestion,
      answerStats,
      answeredCount: Number(answeredCount || 0),
      leaderboard,
      prizes,
      participantsCount: Number(participantsCount || 0),
      participant: participant && session.status === "QUESTION_ANSWERING" ? { ...participant, rank: null } : participant,
      hasAnsweredCurrentQuestion,
      participantCurrentAnswer,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/yamboly/state:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener estado" },
      { status: 500 }
    );
  }
}
