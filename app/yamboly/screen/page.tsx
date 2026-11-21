"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RouletteWheel } from "../components/RouletteWheel";
import { Trophy, Crown, CheckCircle2, Flame, Users, Sparkles, Clock, Scale } from "lucide-react";
import "../yamboly.css";

export default function YambolyScreenPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>("");
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerTotal, setTimerTotal] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const clockOffset = useRef(0);
  // Evita que cada actualización reinicie la animación con un nuevo arreglo equivalente.
  const categoryKey = JSON.stringify(data?.categories ?? []);
  const stableCategories = useMemo(() => JSON.parse(categoryKey), [categoryKey]);

  // Poll state every 1.2 seconds for real-time synchronization
  useEffect(() => {
    if (typeof window !== "undefined") {
      setJoinUrl(`${window.location.origin}/yamboly`);
    }

    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch("/api/yamboly/state");
        if (!res.ok) throw new Error("Error al consultar estado");
        const json = await res.json();
        if (isMounted) {
          clockOffset.current = Date.parse(json.serverTime) - Date.now();
          setData(json);
          setError(null);

          // Handle spinning trigger
          if (json.session.status === "ROULETTE" && !isSpinning) {
            setIsSpinning(true);
          } else if (json.session.status !== "ROULETTE" && isSpinning) {
            setIsSpinning(false);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSpinning]);

  // Synchronized countdown timer for projector screen
  useEffect(() => {
    if (!data?.session) return;
    const session = data.session;

    let start = 0;
    let duration = 0;

    if (session.status === "QUESTION_READING" && session.reading_start_time) {
      start = new Date(session.reading_start_time).getTime();
      duration = (session.reading_duration_sec || 8) * 1000;
    } else if (session.status === "QUESTION_ANSWERING" && session.answering_start_time) {
      start = new Date(session.answering_start_time).getTime();
      duration = (session.answering_duration_sec || 20) * 1000;
    }

    if (start && duration) {
      setTimerTotal(duration / 1000);
      const tick = () => {
        const elapsed = (session.paused_at ? new Date(session.paused_at).getTime() : Date.now() + clockOffset.current) - start;
        const left = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        setTimerRemaining(left);
      };
      tick();
      const timerInt = setInterval(tick, 250);
      return () => clearInterval(timerInt);
    } else {
      setTimerRemaining(0);
    }
  }, [data?.session?.status, data?.session?.reading_start_time, data?.session?.answering_start_time, data?.session?.paused_at]);

  if (!data) {
    return (
      <div className="yb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="yb-badge-live" style={{ marginBottom: "1rem" }}>CONECTANDO SISTEMA</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Iniciando Yámboly Quiz Challenge...</h2>
        </div>
      </div>
    );
  }

  const {
    session,
    currentQuestion,
    answerStats,
    leaderboard,
    prizes,
    playedQuestions,
    settings,
    tiebreak,
  } = data;
  const categories = stableCategories;
  const status = session.status;
  const currentRound = session.current_round || 0;
  const totalRounds = session.total_rounds || 5;
  const participantsCount = Number(data.participantsCount || 0);
  const answeredCount = Number(data.answeredCount || 0);
  const readingSec = settings?.readingDurationSec ?? 8;
  const answeringSec = settings?.answeringDurationSec ?? 20;
  const pointsPerCorrect = settings?.pointsPerCorrect ?? 4;
  const tieSeconds = (settings?.tieThresholdMs ?? 1000) / 1000;
  const inTiebreak = (session.tiebreak_round || 0) > 0;
  const prizeFor = (place: number) => prizes?.find((prize: any) => prize.place === place);
  // El podio muestra solo los puestos premiados (hasta 3 columnas).
  const podiumPlaces = Math.min(3, Number(data.prizePlaces) || 3);
  // Participantes en empate técnico que todavía afecta puestos premiados.
  const relevantTieIds = new Set<number>((tiebreak?.groups ?? []).flatMap((g: any) => g.participants.map((x: any) => x.id)));

  return (
    <div className="yb-root">
      <div className="yb-container">
        
        {/* Top Header */}
        <header className="yb-header yb-hud-panel">
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/sponsor/yamboli.jpg"
                alt="Logo Yámboly"
                style={{ height: "42px", width: "auto", borderRadius: "8px", objectFit: "contain", background: "#fff", padding: "2px" }}
              />
              <span style={{ fontSize: "1.1rem", color: "var(--yb-cyan)", fontWeight: 800 }}>
                QUIZ CHALLENGE
              </span>
            </div>
            <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 700 }}>
              FULL DAY ISACA UNT 2026
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div className="yb-badge-live">TRANSMISIÓN EN VIVO</div>
            <div
              style={{
                padding: "8px 20px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, rgba(0, 111, 245, 0.3) 0%, rgba(174, 29, 245, 0.3) 100%)",
                border: "1.5px solid rgba(66, 220, 255, 0.5)",
                fontSize: "1rem",
                fontWeight: 900,
                color: "#fff",
                boxShadow: "0 0 20px rgba(0, 111, 245, 0.4)",
              }}
            >
              {inTiebreak || status === "TIEBREAK" ? "DESEMPATE" : `RONDA ${currentRound} / ${totalRounds}`}
            </div>
          </div>
        </header>

        {/* STAGE 1: WAITING REGISTRATION / LOBBY */}
        {status === "WAITING_REGISTRATION" && (
          <div className="yb-screen-grid">
            
            {/* Holographic QR Card */}
            <div className="yb-hud-panel yb-qr-card">
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "var(--yb-cyan)", fontWeight: 800, letterSpacing: "3px", fontSize: "0.9rem" }}>
                  ¡PARTICIPA DESDE TU CELULAR!
                </span>
                <h1 style={{ fontSize: "clamp(2.2rem, 3.8vw, 3.2rem)", fontWeight: 900, marginTop: "0.5rem", letterSpacing: "-0.5px" }}>
                  Escanea para Competir
                </h1>
                <p style={{ color: "#94a3b8", fontSize: "1.15rem", marginTop: "0.5rem" }}>
                  Abre la cámara de tu smartphone y únete a la dinámica en vivo.
                </p>
              </div>

              {/* QR Frame with Laser scanning line */}
              <div className="yb-qr-frame">
                {joinUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=290x290&margin=10&data=${encodeURIComponent(
                      joinUrl
                    )}`}
                    alt="Código QR para ingresar a la dinámica"
                    width={290}
                    height={290}
                    style={{ display: "block", borderRadius: "12px" }}
                  />
                ) : (
                  <div style={{ width: 290, height: 290, background: "#eee" }} />
                )}
              </div>

              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--yb-cyan)", letterSpacing: "1px" }}>
                {joinUrl.replace(/^https?:\/\//, "")}
              </div>

              {/* Connected Count */}
              <div className="yb-counter-box">
                <div className="yb-counter-number">{participantsCount}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 900, fontSize: "1.25rem", color: "#fff" }}>
                    Participantes Conectados
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--yb-cyan)", fontWeight: 700 }}>
                    Registro abierto · Esperando inicio de la Ronda 1...
                  </div>
                </div>
              </div>
            </div>

            {/* Prizes and Rules */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              <div className="yb-hud-panel" style={{ padding: "2.25rem 2rem" }}>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: "1.25rem", color: "var(--yb-gold)" }}>
                  Premios Oficiales Yámboly
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                  {prizes?.map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.25rem",
                        padding: "1.1rem",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: "16px",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "14px",
                          background: p.place === 1 ? "var(--yb-gold)" : p.place === 2 ? "#cbd5e1" : "#cd7f32",
                          color: "#000",
                          fontWeight: 900,
                          fontSize: "1.4rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 0 20px rgba(255,255,255,0.25)",
                        }}
                      >
                        {p.place}°
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff" }}>{p.title}</div>
                        <div style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "3px" }}>
                          {p.description}
                          {p.units > 1 ? ` · ${p.units} unidades` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="yb-hud-panel" style={{ padding: "1.75rem 2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: "0.85rem", color: "var(--yb-cyan)" }}>
                  Reglas del Torneo
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "1rem", color: "#cbd5e1" }}>
                  <li> <strong>{totalRounds} Rondas</strong> con temáticas sorteadas en vivo por la <strong>Ruleta Yámboly</strong>.</li>
                  <li> Las preguntas y categorías ya sorteadas se descartan de la ruleta.</li>
                  <li> <strong>{readingSec} Segundos</strong> de lectura bloqueada para pensar antes de marcar.</li>
                  <li> <strong>{answeringSec} Segundos</strong> para marcar en tu celular.</li>
                  <li> <strong>+{pointsPerCorrect} Puntos</strong> por acierto. Empates: más aciertos difíciles, luego intermedios y luego velocidad.</li>
                  <li> Si persiste un empate en puestos premiados, se juegan hasta <strong>{settings?.maxTiebreakQuestions ?? 3} preguntas de desempate</strong>. Si persiste en el primer puesto, se realizará un sorteo externo.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: ROULETTE SPINNING & ROUNDS MONITOR */}
        {status === "ROULETTE" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "2rem", alignItems: "center" }}>
            
            {/* Roulette Canvas */}
            <div className="yb-hud-panel" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <span className="yb-badge-live" style={{ marginBottom: "1rem" }}>
                SORTEO DE RONDA {currentRound} DE {totalRounds}
              </span>
              <h1 style={{ fontSize: "clamp(2rem, 3.2vw, 2.8rem)", fontWeight: 900, marginBottom: "1rem" }}>
                Ruleta temática · categoría sorteada
              </h1>
              <RouletteWheel
                categories={categories}
                targetCategoryId={session.current_category_id}
                isSpinning={isSpinning}
                size={480}
              />
            </div>

            {/* Rounds & Discard Tracker */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="yb-hud-panel" style={{ padding: "2rem" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--yb-cyan)", marginBottom: "1.25rem" }}>
                  Seguimiento de Rondas ({currentRound} de {totalRounds})
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {Array.from({ length: totalRounds }).map((_, idx) => {
                    const roundNum = idx + 1;
                    const isCompleted = roundNum < currentRound;
                    const isCurrent = roundNum === currentRound;
                    const playedQ = playedQuestions?.[idx];

                    return (
                      <div
                        key={roundNum}
                        style={{
                          padding: "1rem 1.35rem",
                          borderRadius: "16px",
                          background: isCurrent
                            ? "rgba(0, 111, 245, 0.25)"
                            : isCompleted
                            ? "rgba(0, 245, 155, 0.1)"
                            : "rgba(255, 255, 255, 0.03)",
                          border: `1.5px solid ${
                            isCurrent
                              ? "var(--yb-cyan)"
                              : isCompleted
                              ? "var(--yb-green)"
                              : "rgba(255, 255, 255, 0.08)"
                          }`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "10px",
                              background: isCompleted ? "var(--yb-green)" : isCurrent ? "var(--yb-cyan)" : "#334155",
                              color: isCompleted || isCurrent ? "#000" : "#fff",
                              fontWeight: 900,
                              fontSize: "0.95rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {roundNum}
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, color: "#fff", fontSize: "1rem" }}>
                              {isCompleted && playedQ
                                ? `Ronda ${roundNum}: ${playedQ.category_name}`
                                : isCurrent
                                ? `Ronda ${roundNum}: Sorteando en ruleta...`
                                : `Ronda ${roundNum}: Por sortear`}
                            </div>
                            {isCompleted && playedQ && (
                              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                Pregunta resuelta · Descartada de la ruleta
                              </div>
                            )}
                          </div>
                        </div>

                        {isCompleted && (
                          <span style={{ color: "var(--yb-green)", fontWeight: 900, fontSize: "0.9rem" }}>
                            ✓ Jugada
                          </span>
                        )}
                        {isCurrent && (
                          <span style={{ color: "var(--yb-cyan)", fontWeight: 900, fontSize: "0.9rem" }}>
                            En Ruleta 🎡
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pool of remaining categories */}
              <div className="yb-hud-panel" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.85rem" }}>
                  Temas Disponibles en la Ruleta
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {categories.map((c: any) => {
                    const isChosen = session.current_category_id === c.id;
                    return (
                      <span
                        key={c.id}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "999px",
                          background: isChosen ? "var(--yb-pink)" : "rgba(255,255,255,0.06)",
                          border: `1.5px solid ${isChosen ? "#ff007a" : "rgba(255,255,255,0.12)"}`,
                          color: "#fff",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                        }}
                      >
                        {c.name} {isChosen ? "🎯" : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIEBREAK ANNOUNCEMENT */}
        {status === "TIEBREAK" && (
          <div className="yb-hud-panel" style={{ padding: "3.5rem 2.5rem", textAlign: "center" }}>
            <span className="yb-badge-live" style={{ marginBottom: "0.75rem" }}>
              PREGUNTA DE DESEMPATE #{(session.tiebreak_round || 0) + 1}
            </span>
            <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0 1rem" }}>
              <Scale size={64} color="var(--yb-gold)" />
            </div>
            <h1 style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)", fontWeight: 900, color: "var(--yb-gold)" }}>
              ¡Empate en puestos premiados!
            </h1>
            <p style={{ color: "#cbd5e1", fontSize: "1.25rem", marginTop: "0.75rem" }}>
              Solo estos participantes responderán una pregunta adicional. No suma puntos: decide el orden del empate.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem", margin: "2rem 0" }}>
              {tiebreak?.contenders?.map((p: any) => (
                <span
                  key={p.id}
                  style={{
                    padding: "0.9rem 1.6rem",
                    borderRadius: "16px",
                    background: "rgba(255, 183, 3, 0.15)",
                    border: "1.5px solid var(--yb-gold)",
                    fontSize: "1.4rem",
                    fontWeight: 900,
                  }}
                >
                  {p.full_name}
                </span>
              ))}
            </div>
            <p style={{ color: "#94a3b8", fontSize: "1.05rem" }}>
              Gana quien acierte; entre quienes aciertan, el más rápido. Menos de {tieSeconds}s de diferencia sigue siendo
              empate.
            </p>
          </div>
        )}

        {/* STAGE 3, 4, 5: QUESTION DISPLAY (READING, ANSWERING, REVEAL) */}
        {["QUESTION_READY", "QUESTION_READING", "QUESTION_ANSWERING", "QUESTION_REVEAL"].includes(status) && currentQuestion && (
          <div className="yb-hud-panel yb-question-box">
            
            {/* Header info */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div
                className="yb-category-tag"
                style={{
                  background: inTiebreak ? "rgba(255, 183, 3, 0.15)" : `${currentQuestion.category_color}22`,
                  border: `1.5px solid ${inTiebreak ? "var(--yb-gold)" : currentQuestion.category_color}`,
                  color: inTiebreak ? "var(--yb-gold)" : currentQuestion.category_color,
                }}
              >
                {inTiebreak
                  ? `⚖️ DESEMPATE #${session.tiebreak_round} · ${tiebreak?.contenders?.map((p: any) => p.full_name).join(" vs ")}`
                  : currentQuestion.category_name}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <span style={{ fontSize: "0.95rem", color: "#94a3b8", fontWeight: 800 }}>
                  DIFICULTAD: {currentQuestion.difficulty}
                </span>

                {status !== "QUESTION_REVEAL" && status !== "QUESTION_READY" && (
                  <div
                    style={{
                      fontSize: "2.4rem",
                      fontWeight: 900,
                      color: timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)",
                      minWidth: "70px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      textShadow: `0 0 20px ${timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)"}`,
                    }}
                  >
                    {session.paused_at ? "PAUSA · " : ""}{timerRemaining}s
                  </div>
                )}
              </div>
            </div>

            {/* Countdown bar */}
            {status !== "QUESTION_REVEAL" && status !== "QUESTION_READY" && (
              <div className="yb-timer-bar-wrap">
                <div
                  className="yb-timer-bar-fill"
                  style={{
                    width: `${(timerRemaining / (timerTotal || 1)) * 100}%`,
                    backgroundColor:
                      status === "QUESTION_READING"
                        ? "var(--yb-purple)"
                        : timerRemaining <= 5
                        ? "var(--yb-red)"
                        : "var(--yb-cyan)",
                  }}
                />
              </div>
            )}

            {/* Notification Banner */}
            {(status === "QUESTION_READY" || status === "QUESTION_READING") && (
              <div
                style={{
                  padding: "0.85rem 1.75rem",
                  background: "rgba(174, 29, 245, 0.2)",
                  border: "1.5px solid rgba(174, 29, 245, 0.5)",
                  borderRadius: "16px",
                  color: "#d8b4fe",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  marginBottom: "1.5rem",
                  display: "inline-block",
                }}
              >
                {session.paused_at ? "⏸ Partida pausada" : status === "QUESTION_READY" ? "🔒 Pregunta visible · esperando inicio de lectura" : timerRemaining > 0 ? `🔒 Tiempo de lectura (${readingSec}s) · Celulares en espera` : "🔒 Lectura terminada · esperando inicio de votación"}
              </div>
            )}

            {status === "QUESTION_ANSWERING" && (
              <div
                style={{
                  padding: "0.85rem 1.75rem",
                  background: "rgba(0, 245, 155, 0.15)",
                  border: "1.5px solid rgba(0, 245, 155, 0.5)",
                  borderRadius: "16px",
                  color: "var(--yb-green)",
                  fontWeight: 900,
                  fontSize: "1.15rem",
                  marginBottom: "1.5rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <span>
                  {session.paused_at ? "⏸ Votación pausada" : timerRemaining <= 0 ? "Votación cerrada · esperando revelación" : inTiebreak
                    ? "⚡ ¡DESEMPATE EN CURSO! Solo responden los participantes empatados."
                    : "⚡ ¡VOTACIÓN EN CURSO! Marca tu alternativa en el celular ahora."}
                </span>
                <span style={{ padding: "4px 12px", background: "rgba(0,0,0,0.4)", borderRadius: "10px", color: "#fff", fontSize: "0.95rem" }}>
                  {answeredCount} {inTiebreak ? `de ${tiebreak?.contenders?.length || 0} ` : ""}respuestas recibidas
                </span>
              </div>
            )}

            {status === "QUESTION_REVEAL" && (
              <div
                style={{
                  padding: "0.85rem 1.75rem",
                  background: "rgba(0, 245, 155, 0.2)",
                  border: "2px solid var(--yb-green)",
                  borderRadius: "16px",
                  color: "var(--yb-green)",
                  fontWeight: 900,
                  fontSize: "1.2rem",
                  marginBottom: "1.5rem",
                  display: "inline-block",
                  boxShadow: "0 0 30px rgba(0, 245, 155, 0.35)",
                }}
              >
                ✓ RESPUESTA CORRECTA REVELADA
              </div>
            )}

            {/* Question Text */}
            <div className="yb-question-text">{currentQuestion.text}</div>

            {/* Options Grid with Esports Colors and Percentage Bars */}
            <div className="yb-options-grid">
              {currentQuestion.options?.map((opt: any) => {
                const isCorrect = status === "QUESTION_REVEAL" && currentQuestion.correct_option_id === opt.id;
                const isWrong = status === "QUESTION_REVEAL" && currentQuestion.correct_option_id !== opt.id;

                const stat = answerStats?.find((s: any) => s.selected_option_id === opt.id);
                const voteCount = stat ? parseInt(stat.count, 10) : 0;
                const totalVotes = answerStats?.reduce((acc: number, s: any) => acc + parseInt(s.count, 10), 0) || 1;
                const percentage = status === "QUESTION_REVEAL" && totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                return (
                  <div
                    key={opt.id}
                    data-opt={opt.id}
                    className={`yb-option-card ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`}
                  >
                    {/* Background fill percentage bar during reveal */}
                    {status === "QUESTION_REVEAL" && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${percentage}%`,
                          background: isCorrect ? "rgba(0, 245, 155, 0.3)" : "rgba(255, 255, 255, 0.08)",
                          borderRadius: "inherit",
                          pointerEvents: "none",
                          transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          zIndex: 0,
                        }}
                      />
                    )}

                    <div
                      className={`yb-option-letter yb-letter-${opt.id}`}
                      style={{
                        backgroundColor: isCorrect ? "var(--yb-green)" : undefined,
                        color: isCorrect ? "#000" : undefined,
                        zIndex: 1,
                      }}
                    >
                      {opt.id}
                    </div>
                    
                    <div style={{ flex: 1, zIndex: 1, fontSize: "1.25rem", fontWeight: 700 }}>
                      {opt.text}
                    </div>

                    {status === "QUESTION_REVEAL" && (
                      <div
                        style={{
                          padding: "6px 16px",
                          borderRadius: "12px",
                          background: isCorrect ? "var(--yb-green)" : "rgba(255,255,255,0.12)",
                          fontSize: "1.1rem",
                          fontWeight: 900,
                          color: isCorrect ? "#000" : "#cbd5e1",
                          zIndex: 1,
                        }}
                      >
                        {percentage}% ({voteCount})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 6: ROUND RANKING / LEADERBOARD */}
        {status === "ROUND_RANKING" && (
          <div className="yb-hud-panel" style={{ padding: "3rem" }}>
            {tiebreak?.drawPending && (
              <section style={{ marginBottom: "2rem", padding: "1.5rem", border: "1px solid var(--yb-gold)", borderRadius: "16px" }}>
                <h2 style={{ color: "var(--yb-gold)", fontSize: "1.6rem", fontWeight: 900 }}>Empate por el primer puesto · sorteo pendiente</h2>
                <p style={{ marginTop: "0.5rem", color: "#cbd5e1" }}>Se alcanzó el límite de preguntas. Las siguientes personas participarán en el sorteo externo:</p>
                <ul style={{ marginTop: "1rem", paddingLeft: "1.5rem" }}>{tiebreak.drawParticipants.map((p: any) => <li key={p.id}>{p.full_name}</li>)}</ul>
              </section>
            )}
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <span className="yb-badge-live" style={{ marginBottom: "0.75rem" }}>
                {inTiebreak ? `CLASIFICACIÓN TRAS EL DESEMPATE #${session.tiebreak_round}` : `CLASIFICACIÓN TRAS RONDA ${currentRound}`}
              </span>
              <h1 style={{ fontSize: "2.8rem", fontWeight: 900 }}>Tabla de Posiciones en Vivo</h1>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="yb-leaderboard-table">
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "left", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.85rem 1.5rem" }}>Puesto</th>
                    <th style={{ padding: "0.85rem 1.5rem" }}>Participante</th>
                    <th style={{ padding: "0.85rem 1.5rem", textAlign: "center" }}>Aciertos</th>
                    <th style={{ padding: "0.85rem 1.5rem", textAlign: "center" }}>Velocidad Total</th>
                    <th style={{ padding: "0.85rem 1.5rem", textAlign: "right" }}>Puntaje</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard?.map((p: any, idx: number) => {
                    const place = idx + 1;
                    return (
                      <tr key={p.id} className="yb-leaderboard-row">
                        <td style={{ padding: "1.2rem 1.5rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "40px",
                              height: "40px",
                              borderRadius: "12px",
                              fontWeight: 900,
                              background:
                                place === 1
                                  ? "var(--yb-gold)"
                                  : place === 2
                                  ? "#cbd5e1"
                                  : place === 3
                                  ? "#cd7f32"
                                  : "rgba(255,255,255,0.08)",
                              color: place <= 3 ? "#000" : "#fff",
                              boxShadow: place <= 3 ? "0 0 15px currentColor" : undefined,
                            }}
                          >
                            {place}
                          </span>
                        </td>
                        <td style={{ padding: "1.2rem 1.5rem", fontWeight: 800, fontSize: "1.25rem" }}>
                          {p.full_name}
                          {relevantTieIds.has(p.id) && (
                            <span
                              style={{
                                marginLeft: "12px",
                                padding: "3px 10px",
                                borderRadius: "999px",
                                background: "rgba(255, 183, 3, 0.18)",
                                border: "1px solid var(--yb-gold)",
                                color: "var(--yb-gold)",
                                fontSize: "0.8rem",
                                fontWeight: 900,
                                verticalAlign: "middle",
                              }}
                            >
                              EMPATE TÉCNICO
                            </span>
                          )}
                          {p.resolved_by_tiebreak && (
                            <span
                              style={{
                                marginLeft: "12px",
                                padding: "3px 10px",
                                borderRadius: "999px",
                                background: "rgba(0, 245, 155, 0.12)",
                                border: "1px solid var(--yb-green)",
                                color: "var(--yb-green)",
                                fontSize: "0.8rem",
                                fontWeight: 900,
                                verticalAlign: "middle",
                              }}
                            >
                              ⚖️ DEFINIDO POR DESEMPATE
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "1.2rem 1.5rem", textAlign: "center", color: "var(--yb-cyan)", fontWeight: 800, fontSize: "1.1rem" }}>
                          {p.correct_count} / {currentRound}
                        </td>
                        <td style={{ padding: "1.2rem 1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "1rem" }}>
                          {(p.total_response_time_ms / 1000).toFixed(1)}s
                        </td>
                        <td style={{ padding: "1.2rem 1.5rem", textAlign: "right", fontWeight: 900, fontSize: "1.45rem", color: "var(--yb-cyan)" }}>
                          {p.score} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STAGE 7: FINAL PODIUM & EXTENDED LEADERBOARD */}
        {status === "PODIUM" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Top 3 3D Podium */}
            <div className="yb-hud-panel" style={{ padding: "3.5rem 2rem", textAlign: "center" }}>
              <span className="yb-badge-live" style={{ marginBottom: "0.75rem" }}>
                GRAN FINAL · GANADORES OFICIALES
              </span>
              <h1 style={{ fontSize: "clamp(2.8rem, 4.5vw, 4rem)", fontWeight: 900, color: "var(--yb-gold)" }}>
                Podio Oficial Yámboly
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "1.25rem", marginTop: "0.5rem" }}>
                ¡Felicitaciones a los mejores puntajes del Full Day ISACA UNT!
              </p>

              <div className="yb-podium-wrap">
                {/* 2nd Place */}
                {leaderboard?.[1] && podiumPlaces >= 2 && (
                  <div className="yb-podium-col">
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🥈</div>
                    <div style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: "4px" }}>
                      {leaderboard[1].full_name}
                    </div>
                    <div style={{ color: "var(--yb-cyan)", fontWeight: 900, fontSize: "1.4rem", marginBottom: "1rem" }}>
                      {leaderboard[1].score} pts
                    </div>
                    <div className="yb-podium-pillar yb-pillar-2">
                      <span style={{ fontSize: "2.8rem", fontWeight: 900, color: "#cbd5e1" }}>2°</span>
                      <span style={{ fontSize: "0.9rem", color: "#cbd5e1", marginTop: "8px", padding: "0 10px", fontWeight: 700 }}>
                        {prizeFor(2)?.title ?? ""}
                      </span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {leaderboard?.[0] && (
                  <div className="yb-podium-col">
                    <div className="yb-crown-icon">👑</div>
                    <div style={{ fontWeight: 900, fontSize: "1.5rem", color: "var(--yb-gold)", marginBottom: "4px" }}>
                      {leaderboard[0].full_name}
                    </div>
                    <div style={{ color: "#fff", fontWeight: 900, fontSize: "1.8rem", marginBottom: "1rem" }}>
                      {leaderboard[0].score} pts
                    </div>
                    <div className="yb-podium-pillar yb-pillar-1">
                      <span style={{ fontSize: "3.8rem", fontWeight: 900, color: "var(--yb-gold)" }}>1°</span>
                      <span style={{ fontSize: "1rem", fontWeight: 900, color: "#fff", marginTop: "8px", padding: "0 10px" }}>
                        {prizeFor(1)?.title ?? ""}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard?.[2] && podiumPlaces >= 3 && (
                  <div className="yb-podium-col">
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🥉</div>
                    <div style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: "4px" }}>
                      {leaderboard[2].full_name}
                    </div>
                    <div style={{ color: "var(--yb-cyan)", fontWeight: 900, fontSize: "1.4rem", marginBottom: "1rem" }}>
                      {leaderboard[2].score} pts
                    </div>
                    <div className="yb-podium-pillar yb-pillar-3">
                      <span style={{ fontSize: "2.4rem", fontWeight: 900, color: "#cd7f32" }}>3°</span>
                      <span style={{ fontSize: "0.9rem", color: "#cd7f32", marginTop: "8px", padding: "0 10px", fontWeight: 700 }}>
                        {prizeFor(3)?.title ?? ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extended Leaderboard (4th, 5th, etc.) */}
            {leaderboard?.length > 3 && (
              <div className="yb-hud-panel" style={{ padding: "2.5rem 2rem" }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "1.5rem", color: "var(--yb-cyan)", textAlign: "center" }}>
                  Clasificación General (Top 10 Final)
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="yb-leaderboard-table">
                    <thead>
                      <tr style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "left", textTransform: "uppercase" }}>
                        <th style={{ padding: "0.75rem 1.25rem" }}>Puesto</th>
                        <th style={{ padding: "0.75rem 1.25rem" }}>Participante</th>
                        <th style={{ padding: "0.75rem 1.25rem", textAlign: "center" }}>Aciertos</th>
                        <th style={{ padding: "0.75rem 1.25rem", textAlign: "center" }}>Velocidad Total</th>
                        <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Puntaje Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((p: any, idx: number) => {
                        const place = idx + 1;
                        return (
                          <tr key={p.id} className="yb-leaderboard-row">
                            <td style={{ padding: "1rem 1.25rem" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "10px",
                                  fontWeight: 900,
                                  background:
                                    place === 1
                                      ? "var(--yb-gold)"
                                      : place === 2
                                      ? "#cbd5e1"
                                      : place === 3
                                      ? "#cd7f32"
                                      : "rgba(255,255,255,0.06)",
                                  color: place <= 3 ? "#000" : "#fff",
                                }}
                              >
                                {place}°
                              </span>
                            </td>
                            <td style={{ padding: "1rem 1.25rem", fontWeight: 800, fontSize: "1.15rem" }}>
                              {p.full_name}
                            </td>
                            <td style={{ padding: "1rem 1.25rem", textAlign: "center", color: "var(--yb-cyan)", fontWeight: 700 }}>
                              {p.correct_count} / {totalRounds}
                            </td>
                            <td style={{ padding: "1rem 1.25rem", textAlign: "center", color: "#94a3b8" }}>
                              {(p.total_response_time_ms / 1000).toFixed(1)}s
                            </td>
                            <td style={{ padding: "1rem 1.25rem", textAlign: "right", fontWeight: 900, fontSize: "1.3rem", color: "var(--yb-cyan)" }}>
                              {p.score} pts
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
