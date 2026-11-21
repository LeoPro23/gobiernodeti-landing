"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RouletteWheel } from "../components/RouletteWheel";
import { ConfettiCanvas } from "../components/ConfettiCanvas";
import { Trophy, Crown, CheckCircle2, Flame, Users, Sparkles, Clock, Scale, Gift, Award } from "lucide-react";
import "../yamboly.css";

function getRankBadgeConfig(place: number) {
  if (place === 1) {
    return {
      bg: "linear-gradient(135deg, #fef08a 0%, #f59e0b 100%)",
      color: "#78350f",
      border: "1.5px solid #d97706",
      shadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
      icon: "🥇",
      rowClass: "yb-row-rank-1",
      scoreColor: "#b45309",
    };
  }
  if (place === 2) {
    return {
      bg: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)",
      color: "#0f172a",
      border: "1.5px solid #94a3b8",
      shadow: "0 4px 12px rgba(148, 163, 184, 0.25)",
      icon: "🥈",
      rowClass: "yb-row-rank-2",
      scoreColor: "#0284c7",
    };
  }
  if (place === 3) {
    return {
      bg: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
      color: "#7c2d12",
      border: "1.5px solid #ea580c",
      shadow: "0 4px 12px rgba(234, 88, 12, 0.25)",
      icon: "🥉",
      rowClass: "yb-row-rank-3",
      scoreColor: "#c2410c",
    };
  }
  return {
    bg: "#f8fafc",
    color: "#334155",
    border: "1.5px solid #cbd5e1",
    shadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
    icon: null,
    rowClass: "",
    scoreColor: "#64748b",
  };
}

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
        const res = await fetch(`/api/yamboly/state?t=${Date.now()}`, { cache: "no-store" });
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
    const interval = setInterval(fetchState, 650);
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
      <div className="yb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} suppressHydrationWarning>
        <div style={{ textAlign: "center" }} suppressHydrationWarning>
          <div className="yb-badge-live" style={{ marginBottom: "1rem" }}>CONECTANDO SISTEMA</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--yb-text-title)" }}>
            Iniciando Yámboly Quiz Challenge...
          </h2>
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
    <div className="yb-root" suppressHydrationWarning>
      {/* Confetti Celebration on Grand Final Podium */}
      <ConfettiCanvas active={status === "PODIUM"} />

      {/* Large Yámboly Watermark for the Auditorium Screen */}
      <div className="yb-watermark-bg" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/sponsor/yamboli.jpg" alt="Marca de Agua Yámboly" />
      </div>

      <div className="yb-container">
        {/* Top Header */}
        <header className="yb-header">
          <div className="yb-brand-tag">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sponsor/yamboli.jpg"
              alt="Logo Yámboly"
              className="yb-brand-logo"
            />
            <div>
              <div className="yb-brand-name">YÁMBOLY QUIZ CHALLENGE</div>
              <div className="yb-brand-sub">Patrocinador Oficial · Helados Yámboly</div>
            </div>
            <div style={{ width: "1px", height: "28px", background: "rgba(148, 163, 184, 0.3)", margin: "0 8px" }} />
            <span style={{ fontSize: "0.92rem", color: "var(--yb-text-muted)", fontWeight: 700 }}>
              FULL DAY ISACA UNT 2026
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div className="yb-badge-live">TRANSMISIÓN EN VIVO</div>
            <div
              style={{
                padding: "8px 22px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, var(--yb-primary) 0%, var(--yb-cyan) 100%)",
                fontSize: "0.95rem",
                fontWeight: 900,
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(230, 0, 126, 0.3)",
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
                <span style={{ color: "var(--yb-primary)", fontWeight: 800, letterSpacing: "3px", fontSize: "0.9rem" }}>
                  ¡PARTICIPA DESDE TU CELULAR!
                </span>
                <h1 style={{ fontSize: "clamp(2.2rem, 3.8vw, 3.2rem)", fontWeight: 900, marginTop: "0.5rem", letterSpacing: "-0.5px" }}>
                  Escanea para Competir
                </h1>
                <p style={{ color: "var(--yb-text-muted)", fontSize: "1.15rem", marginTop: "0.5rem" }}>
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
                    style={{ display: "block", borderRadius: "14px" }}
                  />
                ) : (
                  <div style={{ width: 290, height: 290, background: "#f1f5f9" }} />
                )}
              </div>

              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--yb-cyan)", letterSpacing: "1px" }}>
                {joinUrl.replace(/^https?:\/\//, "")}
              </div>

              {/* Connected Count */}
              <div className="yb-counter-box">
                <div className="yb-counter-number">{participantsCount}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 900, fontSize: "1.25rem", color: "var(--yb-text-title)" }}>
                    Participantes Conectados
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--yb-primary)", fontWeight: 700 }}>
                    Registro abierto · Esperando inicio de la Ronda 1...
                  </div>
                </div>
              </div>
            </div>

            {/* Prizes and Rules */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="yb-hud-panel" style={{ padding: "2.25rem 2rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--yb-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
                    <Gift size={26} /> Premios Oficiales Yámboly
                  </h2>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--yb-gold)", background: "rgba(255, 183, 3, 0.12)", padding: "4px 12px", borderRadius: "999px" }}>
                    TOP 3 PREMIADOS
                  </span>
                </div>

                {/* Prize Banner preview */}
                <div style={{ display: "flex", gap: "14px", alignItems: "center", padding: "12px", background: "linear-gradient(135deg, #fff0f6 0%, #fff 100%)", borderRadius: "18px", border: "1.5px solid rgba(230, 0, 126, 0.2)", marginBottom: "1.25rem" }}>
                  <div style={{ width: "90px", height: "70px", borderRadius: "12px", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(230,0,126,0.2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/sponsor/premio.webp" alt="Caja de Helados Yámboly" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 900, color: "var(--yb-text-title)" }}>Caja de Helados Yámboly</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--yb-text-muted)" }}>¡Gana una deliciosa caja de helados Yámboly con Magneto Crunchy Vanilla para los mejores puestos!</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {prizes?.map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.25rem",
                        padding: "1rem 1.25rem",
                        background: "#ffffff",
                        borderRadius: "18px",
                        border: "1.5px solid rgba(148, 163, 184, 0.2)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "14px",
                          background: p.place === 1 ? "var(--yb-gold)" : p.place === 2 ? "#cbd5e1" : "#d97706",
                          color: p.place === 1 ? "#000" : "#ffffff",
                          fontWeight: 900,
                          fontSize: "1.3rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      >
                        {p.place}°
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "var(--yb-text-title)" }}>{p.title}</div>
                        <div style={{ fontSize: "0.88rem", color: "var(--yb-text-muted)", marginTop: "2px" }}>
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
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.95rem", color: "var(--yb-text-body)" }}>
                  <li>🍦 <strong>Rondas temáticas</strong> sorteadas en vivo por la <strong>Ruleta Yámboly</strong>.</li>
                  <li>🎯 Las preguntas y categorías ya sorteadas se descartan de la ruleta.</li>
                  <li>⏱️ <strong>Tiempo de lectura</strong> en pantalla para analizar la pregunta antes de responder.</li>
                  <li>📱 <strong>Tiempo cronometrado</strong> para marcar tu respuesta en el celular.</li>
                  <li>🏆 <strong>Puntaje por acierto</strong>. En caso de empate, define la dificultad y la velocidad de respuesta.</li>
                  <li>⚖️ Si persiste un empate en puestos premiados, se juegan <strong>preguntas de desempate</strong>. Si persiste en el primer puesto, se define por sorteo.</li>
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
              <h1 style={{ fontSize: "clamp(2rem, 3.2vw, 2.8rem)", fontWeight: 900, marginBottom: "1rem", color: "var(--yb-text-title)" }}>
                Girando la Ruleta Temática...
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
                <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--yb-primary)", marginBottom: "1.25rem" }}>
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
                          borderRadius: "18px",
                          background: isCurrent
                            ? "linear-gradient(135deg, rgba(230, 0, 126, 0.08) 0%, rgba(0, 163, 224, 0.08) 100%)"
                            : isCompleted
                            ? "rgba(16, 185, 129, 0.08)"
                            : "#ffffff",
                          border: `1.5px solid ${
                            isCurrent
                              ? "var(--yb-primary)"
                              : isCompleted
                              ? "var(--yb-green)"
                              : "rgba(148, 163, 184, 0.25)"
                          }`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          boxShadow: isCurrent ? "0 4px 16px rgba(230, 0, 126, 0.12)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              background: isCompleted
                                ? "var(--yb-green)"
                                : isCurrent
                                ? "var(--yb-primary)"
                                : "#e2e8f0",
                              color: isCompleted || isCurrent ? "#ffffff" : "#475569",
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
                            <div style={{ fontWeight: 800, color: "var(--yb-text-title)", fontSize: "1rem" }}>
                              {isCompleted && playedQ
                                ? `Ronda ${roundNum}: ${playedQ.category_name}`
                                : isCurrent
                                ? `Ronda ${roundNum}: Sorteando en ruleta...`
                                : `Ronda ${roundNum}: Por sortear`}
                            </div>
                            {isCompleted && playedQ && (
                              <div style={{ fontSize: "0.8rem", color: "var(--yb-text-muted)" }}>
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
                          <span style={{ color: "var(--yb-primary)", fontWeight: 900, fontSize: "0.9rem" }}>
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
                <div style={{ fontSize: "0.85rem", color: "var(--yb-text-muted)", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.85rem" }}>
                  Temas Disponibles en la Ruleta
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {categories.map((c: any) => {
                    const isChosen = session.current_category_id === c.id;
                    return (
                      <span
                        key={c.id}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "999px",
                          background: isChosen ? "var(--yb-primary)" : "#ffffff",
                          border: `1.5px solid ${isChosen ? "var(--yb-primary)" : "rgba(148, 163, 184, 0.3)"}`,
                          color: isChosen ? "#ffffff" : "var(--yb-text-title)",
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          boxShadow: isChosen ? "0 4px 12px rgba(230, 0, 126, 0.3)" : "none",
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
            <p style={{ color: "var(--yb-text-body)", fontSize: "1.25rem", marginTop: "0.75rem" }}>
              Solo estos participantes responderán una pregunta adicional. No suma puntos: decide el orden del empate.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem", margin: "2rem 0" }}>
              {tiebreak?.contenders?.map((p: any) => (
                <span
                  key={p.id}
                  style={{
                    padding: "0.9rem 1.6rem",
                    borderRadius: "18px",
                    background: "rgba(255, 183, 3, 0.15)",
                    border: "2px solid var(--yb-gold)",
                    fontSize: "1.4rem",
                    fontWeight: 900,
                    color: "var(--yb-text-title)",
                  }}
                >
                  {p.full_name}
                </span>
              ))}
            </div>
            <p style={{ color: "var(--yb-text-muted)", fontSize: "1.05rem" }}>
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
                  background: inTiebreak ? "rgba(255, 183, 3, 0.15)" : `${currentQuestion.category_color}18`,
                  border: `1.5px solid ${inTiebreak ? "var(--yb-gold)" : currentQuestion.category_color}`,
                  color: inTiebreak ? "#d97706" : currentQuestion.category_color,
                }}
              >
                {inTiebreak
                  ? `⚖️ DESEMPATE #${session.tiebreak_round} · ${tiebreak?.contenders?.map((p: any) => p.full_name).join(" vs ")}`
                  : currentQuestion.category_name}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <span style={{ fontSize: "0.95rem", color: "var(--yb-text-muted)", fontWeight: 800 }}>
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
                    }}
                  >
                    {session.paused_at ? "PAUSA · " : ""}{timerRemaining}s
                  </div>
                )}
              </div>
            </div>

            {/* Reading vs Answering Badge Indicator */}
            <div style={{ margin: "1rem 0" }}>
              {(status === "QUESTION_READY" || status === "QUESTION_READING") && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--yb-gold)", fontWeight: 800, fontSize: "1.1rem" }}>
                  <Clock size={22} />
                  <span>
                    {session.paused_at ? "⏸ Partida pausada" : status === "QUESTION_READY" ? "🔒 Pregunta visible · esperando inicio de lectura" : `TIEMPO DE LECTURA (${readingSec}s)`}
                  </span>
                </div>
              )}
              {status === "QUESTION_ANSWERING" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--yb-green)", fontWeight: 800, fontSize: "1.1rem" }}>
                  <Flame size={22} />
                  <span>
                    {session.paused_at ? "⏸ Votación pausada" : inTiebreak ? "¡DESEMPATE EN CURSO! Marca tu respuesta en el celular" : "¡VOTACIÓN ABIERTA! Marca tu respuesta en el celular"}
                  </span>
                </div>
              )}
              {status === "QUESTION_REVEAL" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--yb-primary)", fontWeight: 800, fontSize: "1.1rem" }}>
                  <CheckCircle2 size={22} />
                  <span>RESPUESTA OFICIAL REVELADA</span>
                </div>
              )}
            </div>

            {/* Question Text */}
            <h1 className="yb-question-text">{currentQuestion.text}</h1>

            {/* Progress Timer Bar */}
            {status !== "QUESTION_REVEAL" && status !== "QUESTION_READY" && (
              <div className="yb-timer-bar-wrap">
                <div
                  className="yb-timer-bar-fill"
                  style={{
                    width: `${(timerRemaining / (timerTotal || 1)) * 100}%`,
                    backgroundColor: timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)",
                  }}
                />
              </div>
            )}

            {/* Telemetry info bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1.5rem",
                borderRadius: "14px",
                background: "#f8fafc",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                marginBottom: "1.5rem",
                fontSize: "0.95rem",
                color: "var(--yb-text-muted)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={18} color="var(--yb-primary)" />
                <span>
                  <strong>{answeredCount}</strong> {inTiebreak ? `de ${tiebreak?.contenders?.length || 0} ` : `de ${participantsCount} `}participantes han respondido
                </span>
              </div>
              <div>
                Ronda <strong>{currentRound}</strong> de <strong>{totalRounds}</strong>
              </div>
            </div>

            {/* Options Grid */}
            <div className="yb-options-grid">
              {currentQuestion.options?.map((opt: any) => {
                const isCorrect = status === "QUESTION_REVEAL" && currentQuestion.correct_option_id === opt.id;
                const isWrong = status === "QUESTION_REVEAL" && !isCorrect;
                const voteCount = data?.answerStatsMap
                  ? Number(data.answerStatsMap[opt.id] || 0)
                  : Array.isArray(answerStats)
                  ? Number(answerStats.find((s: any) => s.selected_option_id === opt.id)?.count || 0)
                  : Number(answerStats?.[opt.id] || 0);
                const totalVotes: number = Number(
                  data?.answerStatsMap
                    ? Object.values(data.answerStatsMap).reduce((a: any, b: any) => Number(a) + Number(b), 0)
                    : Array.isArray(answerStats)
                    ? answerStats.reduce((sum: number, s: any) => sum + Number(s.count || 0), 0)
                    : Object.values(answerStats || {}).reduce((a: any, b: any) => Number(a) + Number(b), 0)
                );
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

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
                          background: isCorrect ? "rgba(16, 185, 129, 0.25)" : "rgba(148, 163, 184, 0.12)",
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
                          background: isCorrect ? "var(--yb-green)" : "#e2e8f0",
                          fontSize: "1.1rem",
                          fontWeight: 900,
                          color: isCorrect ? "#ffffff" : "var(--yb-text-body)",
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
              <h1 style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--yb-text-title)" }}>
                Tabla de Posiciones en Vivo
              </h1>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="yb-leaderboard-table">
                <thead>
                  <tr style={{ color: "var(--yb-text-muted)", fontSize: "0.9rem", textAlign: "left", textTransform: "uppercase" }}>
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
                    const cfg = getRankBadgeConfig(place);
                    return (
                      <tr key={p.id} className={`yb-leaderboard-row ${cfg.rowClass}`}>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              padding: "6px 14px",
                              borderRadius: "999px",
                              fontWeight: 900,
                              fontSize: "1rem",
                              background: cfg.bg,
                              color: cfg.color,
                              border: cfg.border,
                              boxShadow: cfg.shadow,
                            }}
                          >
                            {cfg.icon ? <span style={{ fontSize: "1.1rem" }}>{cfg.icon}</span> : null}
                            <span>{place}°</span>
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--yb-text-title)" }}>
                          {p.full_name}
                          {relevantTieIds.has(p.id) && (
                            <span
                              style={{
                                marginLeft: "12px",
                                padding: "4px 12px",
                                borderRadius: "999px",
                                background: "rgba(255, 183, 3, 0.18)",
                                border: "1px solid var(--yb-gold)",
                                color: "#b45309",
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
                                padding: "4px 12px",
                                borderRadius: "999px",
                                background: "rgba(16, 185, 129, 0.15)",
                                border: "1px solid var(--yb-green)",
                                color: "#065f46",
                                fontSize: "0.8rem",
                                fontWeight: 900,
                                verticalAlign: "middle",
                              }}
                            >
                              ⚖️ DEFINIDO POR DESEMPATE
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 12px",
                              borderRadius: "999px",
                              background: "rgba(230, 0, 126, 0.08)",
                              color: "var(--yb-primary)",
                              fontWeight: 800,
                              fontSize: "1rem",
                            }}
                          >
                            {p.correct_count} / {currentRound}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "0.95rem" }}>
                          ⏱️ {(p.total_response_time_ms / 1000).toFixed(1)}s
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 900,
                            fontSize: "1.4rem",
                            color: p.score > 0 ? (place <= 3 ? cfg.scoreColor : "var(--yb-primary)") : "#94a3b8",
                          }}
                        >
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
            {/* Top 3 3D Podium & Prize Showcase */}
            <div className="yb-hud-panel" style={{ padding: "3.5rem 2rem", textAlign: "center" }}>
              <span className="yb-badge-live" style={{ marginBottom: "0.75rem" }}>
                GRAN FINAL · GANADORES OFICIALES
              </span>
              <h1 style={{ fontSize: "clamp(2.8rem, 4.5vw, 4rem)", fontWeight: 900, color: "var(--yb-primary)" }}>
                Podio Oficial Yámboly
              </h1>
              <p style={{ color: "var(--yb-text-muted)", fontSize: "1.25rem", marginTop: "0.5rem" }}>
                ¡Felicitaciones a los mejores puntajes del Full Day ISACA UNT!
              </p>

              {/* Official Sponsor Prize Spotlight Box */}
              <div
                style={{
                  maxWidth: "760px",
                  margin: "2rem auto 2.5rem",
                  padding: "1.5rem 2rem",
                  background: "linear-gradient(135deg, #ffffff 0%, #fff0f6 100%)",
                  borderRadius: "24px",
                  border: "2px solid rgba(230, 0, 126, 0.25)",
                  boxShadow: "0 10px 30px rgba(230, 0, 126, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: "2rem",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: "160px",
                    height: "120px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "2px solid rgba(230,0,126,0.2)",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/sponsor/premio.webp"
                    alt="Premio Oficial Yámboly"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--yb-primary)", color: "#fff", padding: "3px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "6px" }}>
                    🎁 Premio Oficial del Reto
                  </div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--yb-text-title)", margin: "0 0 4px" }}>
                    Caja de Helados Yámboly
                  </h3>
                  <p style={{ fontSize: "0.92rem", color: "var(--yb-text-body)", margin: 0, lineHeight: 1.4 }}>
                    Entregado en vivo a los mejores lugares del podio con una deliciosa caja de helados Yámboly y Magneto Crunchy Vanilla.
                  </p>
                </div>
              </div>

              <div className="yb-podium-wrap">
                {/* 2nd Place */}
                {leaderboard?.[1] && podiumPlaces >= 2 && (
                  <div className="yb-podium-col">
                    <div style={{ fontSize: "2.8rem", marginBottom: "0.25rem" }}>🥈</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "var(--yb-cyan)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                      🍨 Sabor Silver
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--yb-text-title)", marginBottom: "4px" }}>
                      {leaderboard[1].full_name}
                    </div>
                    <div style={{ color: "var(--yb-cyan)", fontWeight: 900, fontSize: "1.45rem", marginBottom: "1rem" }}>
                      {leaderboard[1].score} pts
                    </div>
                    <div className="yb-podium-pillar yb-pillar-2">
                      <div className="yb-podium-medallion yb-medallion-2">2°</div>
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "10px 14px",
                          borderRadius: "16px",
                          background: "rgba(255, 255, 255, 0.95)",
                          backdropFilter: "blur(6px)",
                          border: "1.5px solid rgba(148, 163, 184, 0.45)",
                          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          maxWidth: "92%",
                        }}
                      >
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(148,163,184,0.3)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/images/sponsor/premio.webp" alt="Premio 2do Puesto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--yb-text-title)", textAlign: "left", lineHeight: 1.25 }}>
                          {prizeFor(2)?.title ?? "Caja de Helados Yámboly"}
                        </span>
                      </div>
                    </div>
                    <div className="yb-podium-stage-base yb-base-2" />
                  </div>
                )}

                {/* 1st Place */}
                {leaderboard?.[0] && (
                  <div className="yb-podium-col">
                    <div className="yb-crown-icon">👑</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #fef08a 0%, #f59e0b 100%)", color: "#78350f", padding: "4px 14px", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)" }}>
                      🍦 CAMPEÓN YÁMBOLY
                    </div>
                    <div style={{ fontWeight: 900, fontSize: "1.65rem", color: "#b45309", marginBottom: "4px" }}>
                      {leaderboard[0].full_name}
                    </div>
                    <div style={{ color: "var(--yb-primary)", fontWeight: 900, fontSize: "2rem", marginBottom: "1rem" }}>
                      {leaderboard[0].score} pts
                    </div>
                    <div className="yb-podium-pillar yb-pillar-1">
                      <div className="yb-podium-medallion yb-medallion-1">1°</div>
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "12px 16px",
                          borderRadius: "18px",
                          background: "rgba(255, 255, 255, 0.98)",
                          backdropFilter: "blur(6px)",
                          border: "2px solid #f59e0b",
                          boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          maxWidth: "94%",
                        }}
                      >
                        <div style={{ width: "44px", height: "44px", borderRadius: "12px", overflow: "hidden", flexShrink: 0, border: "1.5px solid #f59e0b" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/images/sponsor/premio.webp" alt="Premio 1er Puesto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#78350f", textAlign: "left", lineHeight: 1.25 }}>
                          {prizeFor(1)?.title ?? "Caja de Helados Yámboly Campeón"}
                        </span>
                      </div>
                    </div>
                    <div className="yb-podium-stage-base yb-base-1" />
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard?.[2] && podiumPlaces >= 3 && (
                  <div className="yb-podium-col">
                    <div style={{ fontSize: "2.8rem", marginBottom: "0.25rem" }}>🥉</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#c2410c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                      🍧 Sabor Bronze
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--yb-text-title)", marginBottom: "4px" }}>
                      {leaderboard[2].full_name}
                    </div>
                    <div style={{ color: "#d97706", fontWeight: 900, fontSize: "1.45rem", marginBottom: "1rem" }}>
                      {leaderboard[2].score} pts
                    </div>
                    <div className="yb-podium-pillar yb-pillar-3">
                      <div className="yb-podium-medallion yb-medallion-3">3°</div>
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "10px 14px",
                          borderRadius: "16px",
                          background: "rgba(255, 255, 255, 0.95)",
                          backdropFilter: "blur(6px)",
                          border: "1.5px solid rgba(234, 88, 12, 0.45)",
                          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          maxWidth: "92%",
                        }}
                      >
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(234,88,12,0.3)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/images/sponsor/premio.webp" alt="Premio 3er Puesto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--yb-text-title)", textAlign: "left", lineHeight: 1.25 }}>
                          {prizeFor(3)?.title ?? "Caja de Helados Yámboly"}
                        </span>
                      </div>
                    </div>
                    <div className="yb-podium-stage-base yb-base-3" />
                  </div>
                )}
              </div>
            </div>

            {/* Extended Leaderboard (4th, 5th, etc.) */}
            {leaderboard?.length > 3 && (
              <div className="yb-hud-panel" style={{ padding: "2.5rem 2rem" }}>
                <h3 style={{ fontSize: "1.65rem", fontWeight: 900, marginBottom: "1.75rem", color: "var(--yb-primary)", textAlign: "center" }}>
                  Clasificación General (Top 10 Final)
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="yb-leaderboard-table">
                    <thead>
                      <tr style={{ color: "var(--yb-text-muted)", fontSize: "0.85rem", textAlign: "left", textTransform: "uppercase" }}>
                        <th style={{ padding: "0.85rem 1.4rem" }}>Puesto</th>
                        <th style={{ padding: "0.85rem 1.4rem" }}>Participante</th>
                        <th style={{ padding: "0.85rem 1.4rem", textAlign: "center" }}>Aciertos</th>
                        <th style={{ padding: "0.85rem 1.4rem", textAlign: "center" }}>Velocidad Total</th>
                        <th style={{ padding: "0.85rem 1.4rem", textAlign: "right" }}>Puntaje Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((p: any, idx: number) => {
                        const place = idx + 1;
                        const cfg = getRankBadgeConfig(place);
                        return (
                          <tr key={p.id} className={`yb-leaderboard-row ${cfg.rowClass}`}>
                            <td>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "4px",
                                  padding: "6px 14px",
                                  borderRadius: "999px",
                                  fontWeight: 900,
                                  fontSize: "0.95rem",
                                  background: cfg.bg,
                                  color: cfg.color,
                                  border: cfg.border,
                                  boxShadow: cfg.shadow,
                                }}
                              >
                                {cfg.icon ? <span style={{ fontSize: "1rem" }}>{cfg.icon}</span> : null}
                                <span>{place}°</span>
                              </span>
                            </td>
                            <td style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--yb-text-title)" }}>
                              {p.full_name}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "4px 12px",
                                  borderRadius: "999px",
                                  background: "rgba(230, 0, 126, 0.08)",
                                  color: "var(--yb-primary)",
                                  fontWeight: 800,
                                  fontSize: "0.95rem",
                                }}
                              >
                                {p.correct_count} / {totalRounds}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "0.95rem" }}>
                              ⏱️ {(p.total_response_time_ms / 1000).toFixed(1)}s
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: 900,
                                fontSize: "1.35rem",
                                color: p.score > 0 ? (place <= 3 ? cfg.scoreColor : "var(--yb-primary)") : "#94a3b8",
                              }}
                            >
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
