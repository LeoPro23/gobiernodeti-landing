"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  Play, 
  Pause,
  RotateCw, 
  CheckCircle2, 
  Trophy, 
  Crown, 
  Users, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  Flame,
  Sparkles
} from "lucide-react";
import "../yamboly.css";

const PHASES = [
  { id: "WAITING_REGISTRATION", label: "Lobby & QR", icon: Users, desc: "Inscripción abierta" },
  { id: "ROULETTE", label: "Ruleta", icon: RotateCw, desc: "Sorteo de categoría" },
  { id: "QUESTION_READING", label: "Lectura (8s)", icon: Clock, desc: "Móviles bloqueados" },
  { id: "QUESTION_ANSWERING", label: "Votación (20s)", icon: Play, desc: "Votación abierta" },
  { id: "QUESTION_REVEAL", label: "Revelación", icon: CheckCircle2, desc: "Respuesta correcta" },
  { id: "ROUND_RANKING", label: "Ranking", icon: Trophy, desc: "Tabla de posiciones" },
  { id: "PODIUM", label: "Podio Final", icon: Crown, desc: "Premiación oficial" },
];

export default function YambolyModeratorPage() {
  const [data, setData] = useState<any>(null);
  const [passcode, setPasscode] = useState("yamboly2026");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [autoSequence, setAutoSequence] = useState(true); // Default TRUE for fully automated flow!
  const [isPaused, setIsPaused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/yamboly/state");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1200);
    return () => clearInterval(interval);
  }, []);

  const triggerAction = async (type: string, payload: any = {}) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/yamboly/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode,
          action: { type, ...payload },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al ejecutar acción");
      await fetchState();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // FULLY AUTOMATED ROUND SEQUENCE ENGINE:
  // ROULETTE (5s) -> READING (8s) -> ANSWERING (20s) -> REVEAL
  useEffect(() => {
    if (!autoSequence || isPaused || !data?.session) return;
    const session = data.session;
    const status = session.status;

    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    if (status === "ROULETTE") {
      // Wait 5.5s for roulette animation to stop, then automatically show question (reading)
      autoTimerRef.current = setTimeout(() => {
        triggerAction("START_READING");
      }, 5500);
    } else if (status === "QUESTION_READING" && session.reading_start_time) {
      const start = new Date(session.reading_start_time).getTime();
      const elapsed = Date.now() - start;
      const remaining = Math.max(200, 8000 - elapsed);
      autoTimerRef.current = setTimeout(() => {
        triggerAction("START_ANSWERING");
      }, remaining);
    } else if (status === "QUESTION_ANSWERING" && session.answering_start_time) {
      const start = new Date(session.answering_start_time).getTime();
      const elapsed = Date.now() - start;
      const remaining = Math.max(200, 20000 - elapsed);
      autoTimerRef.current = setTimeout(() => {
        triggerAction("REVEAL_ANSWER");
      }, remaining);
    }

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [
    autoSequence, 
    isPaused, 
    data?.session?.status, 
    data?.session?.reading_start_time, 
    data?.session?.answering_start_time
  ]);

  if (!data) {
    return (
      <div className="yb-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="yb-badge-live" style={{ marginBottom: "1rem" }}>CONSOLA DEL DIRECTOR</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Conectando consola...</h2>
        </div>
      </div>
    );
  }

  const { session, currentQuestion, playedQuestions, remainingPerCategory } = data;
  const status = session?.status;
  const currentRound = session?.current_round || 0;
  const totalRounds = session?.total_rounds || 5;

  const participantsCount = Number(data.participantsCount || 0);
  const answeredCount = Number(data.answeredCount || 0);
  const responseRate = participantsCount > 0 ? Math.round((answeredCount / participantsCount) * 100) : 0;

  const currentPhaseIndex = PHASES.findIndex((p) => p.id === status);

  // Compute the primary action button
  let nextAction: { title: string; subtitle: string; action: string; color: string } = {
    title: "Iniciar Dinámica y Girar Ruleta",
    subtitle: `Comenzar Ronda 1 de ${totalRounds}`,
    action: "SPIN_ROULETTE",
    color: "linear-gradient(135deg, #006ff5 0%, #ae1df5 100%)",
  };

  if (status === "WAITING_REGISTRATION") {
    nextAction = {
      title: "Cerrar Inscripción & Girar Ruleta 🎡",
      subtitle: `Inicia la secuencia automática de la Ronda ${currentRound + 1}`,
      action: "SPIN_ROULETTE",
      color: "linear-gradient(135deg, #ff007a 0%, #ae1df5 100%)",
    };
  } else if (status === "ROULETTE") {
    nextAction = {
      title: autoSequence ? "Sorteando... (Avanza solo a Lectura) ⏳" : "Lanzar Pregunta (8s Lectura) 📖",
      subtitle: autoSequence ? "El temporizador automático pasará a lectura en breve" : "Muestra la pregunta en pantalla",
      action: "START_READING",
      color: "linear-gradient(135deg, #7928ca 0%, #006ff5 100%)",
    };
  } else if (status === "QUESTION_READING") {
    nextAction = {
      title: autoSequence ? "Lectura en curso... (Abrirá votación solo) ⏳" : "Habilitar Votación Ahora (20s) ⚡",
      subtitle: autoSequence ? "Al llegar a 0s se desbloquearán los celulares" : "Desbloquea los botones en móviles",
      action: "START_ANSWERING",
      color: "linear-gradient(135deg, #00f59b 0%, #00b4d8 100%)",
    };
  } else if (status === "QUESTION_ANSWERING") {
    nextAction = {
      title: autoSequence ? `Votando... (${answeredCount} de ${participantsCount} votos) ⚡` : "Cerrar Votación y Revelar ✓",
      subtitle: autoSequence ? `Se revelará solo al terminar los 20 segundos` : `${answeredCount} de ${participantsCount} votos recibidos (${responseRate}%)`,
      action: "REVEAL_ANSWER",
      color: "linear-gradient(135deg, #006ff5 0%, #42dcff 100%)",
    };
  } else if (status === "QUESTION_REVEAL") {
    nextAction = {
      title: "Proyectar Tabla de Posiciones 🏆",
      subtitle: `Ranking acumulado tras la Ronda ${currentRound}`,
      action: "SHOW_ROUND_RANKING",
      color: "linear-gradient(135deg, #ffb703 0%, #f77f00 100%)",
    };
  } else if (status === "ROUND_RANKING") {
    if (currentRound < totalRounds) {
      nextAction = {
        title: `Avanzar a Ronda ${currentRound + 1} & Girar Ruleta 🎡`,
        subtitle: `Quedan ${totalRounds - currentRound} rondas por jugar`,
        action: "SPIN_ROULETTE",
        color: "linear-gradient(135deg, #ff007a 0%, #ae1df5 100%)",
      };
    } else {
      nextAction = {
        title: "Proclamar Ganadores y Mostrar Podio Final 👑",
        subtitle: "Entrega oficial de los 3 Premios Yámboly",
        action: "SHOW_PODIUM",
        color: "linear-gradient(135deg, #ffb703 0%, #e63946 100%)",
      };
    }
  } else if (status === "PODIUM") {
    nextAction = {
      title: "Dinámica Finalizada 🎉",
      subtitle: "Podio visible en pantalla de auditorio",
      action: "SHOW_PODIUM",
      color: "linear-gradient(135deg, #00f59b 0%, #006ff5 100%)",
    };
  }

  return (
    <div className="yb-root" style={{ padding: "1.25rem", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        
        {/* TOP STATUS BAR */}
        <header
          className="yb-hud-panel"
          style={{
            padding: "1rem 1.75rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            borderLeft: "5px solid var(--yb-cyan)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sponsor/yamboli.jpg"
              alt="Logo Yámboly"
              style={{ height: "42px", width: "auto", borderRadius: "8px", objectFit: "contain", background: "#fff", padding: "2px" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="yb-badge-live">CONSOLA DEL DIRECTOR</span>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>· Yámboly Quiz Master</span>
              </div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#fff", marginTop: "4px" }}>
                Control de Transmisión en Vivo
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "1px" }}>RONDA</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--yb-cyan)" }}>
                {currentRound} <span style={{ fontSize: "0.85rem", color: "#64748b" }}>/ {totalRounds}</span>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "1px" }}>INSCRITOS</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--yb-green)" }}>
                {participantsCount}
              </div>
            </div>

            {status === "QUESTION_ANSWERING" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "1px" }}>RESPUESTAS</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--yb-pink)" }}>
                  {answeredCount} <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>({responseRate}%)</span>
                </div>
              </div>
            )}

            <Link
              href="/yamboly/screen"
              target="_blank"
              style={{
                padding: "0.6rem 1.25rem",
                borderRadius: "12px",
                background: "rgba(0, 111, 245, 0.2)",
                border: "1px solid var(--yb-border)",
                color: "var(--yb-cyan)",
                fontWeight: 800,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Abrir Pantalla Auditorio ↗
            </Link>
          </div>
        </header>

        {/* STEP PIPELINE TRACK */}
        <div className="yb-hud-panel" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
              Línea de Tiempo del Juego
            </span>

            {/* Auto Sequence Toggle and Pause Switch */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "#cbd5e1" }}>
                <input
                  type="checkbox"
                  checked={autoSequence}
                  onChange={(e) => setAutoSequence(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--yb-cyan)" }}
                />
                <span style={{ fontWeight: autoSequence ? 800 : 500, color: autoSequence ? "var(--yb-green)" : "#94a3b8" }}>
                  ⚡ Secuencia 100% Automática (Ruleta → 8s Lectura → 20s Voto → Revelación)
                </span>
              </label>

              {autoSequence && (
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: isPaused ? "rgba(0, 245, 155, 0.2)" : "rgba(255, 183, 3, 0.2)",
                    border: `1px solid ${isPaused ? "var(--yb-green)" : "var(--yb-gold)"}`,
                    color: isPaused ? "var(--yb-green)" : "var(--yb-gold)",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? "Reanudar Tiempos" : "Pausar Tiempos"}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
            {PHASES.map((phase, idx) => {
              const Icon = phase.icon;
              const isPast = idx < currentPhaseIndex;
              const isCurrent = idx === currentPhaseIndex;

              return (
                <div
                  key={phase.id}
                  onClick={() => {
                    if (confirm(`¿Saltar manualmente a "${phase.label}"?`)) {
                      triggerAction(
                        phase.id === "ROULETTE"
                          ? "SPIN_ROULETTE"
                          : phase.id === "QUESTION_READING"
                          ? "START_READING"
                          : phase.id === "QUESTION_ANSWERING"
                          ? "START_ANSWERING"
                          : phase.id === "QUESTION_REVEAL"
                          ? "REVEAL_ANSWER"
                          : phase.id === "ROUND_RANKING"
                          ? "SHOW_ROUND_RANKING"
                          : phase.id === "PODIUM"
                          ? "SHOW_PODIUM"
                          : "OPEN_REGISTRATION"
                      );
                    }
                  }}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "14px",
                    background: isCurrent
                      ? "rgba(0, 111, 245, 0.25)"
                      : isPast
                      ? "rgba(0, 245, 155, 0.08)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: `1.5px solid ${
                      isCurrent ? "var(--yb-cyan)" : isPast ? "rgba(0, 245, 155, 0.4)" : "rgba(255, 255, 255, 0.08)"
                    }`,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <Icon size={18} color={isCurrent ? "var(--yb-cyan)" : isPast ? "var(--yb-green)" : "#64748b"} />
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: isCurrent ? "var(--yb-cyan)" : "#64748b" }}>
                      #{idx + 1}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: isCurrent ? "#fff" : isPast ? "#cbd5e1" : "#64748b" }}>
                    {phase.label}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
                    {phase.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HERO COMMAND SECTION (THE ONE SMART BUTTON) */}
        <div
          className="yb-hud-panel"
          style={{
            padding: "2.5rem 2rem",
            marginBottom: "1.5rem",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(6, 25, 52, 0.9) 0%, rgba(2, 11, 25, 0.98) 100%)",
            border: "1.5px solid var(--yb-border)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--yb-cyan)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.75rem" }}>
            {autoSequence && (status === "ROULETTE" || status === "QUESTION_READING" || status === "QUESTION_ANSWERING")
              ? "⚡ Secuencia Automática en Marcha (Sin presionar nada)"
              : "Control de Avance"}
          </div>

          <button
            disabled={isActionLoading || status === "PODIUM"}
            onClick={() => triggerAction(nextAction.action)}
            style={{
              padding: "1.3rem 2.8rem",
              borderRadius: "20px",
              background: nextAction.color,
              color: "#ffffff",
              fontSize: "clamp(1.2rem, 2vw, 1.6rem)",
              fontWeight: 900,
              border: "none",
              cursor: status === "PODIUM" ? "default" : "pointer",
              boxShadow: "0 12px 35px rgba(0, 111, 245, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {isActionLoading ? "Ejecutando..." : nextAction.title}
            <ArrowRight size={24} />
          </button>

          <div style={{ fontSize: "1rem", color: "#94a3b8", marginTop: "0.85rem", fontWeight: 600 }}>
            {nextAction.subtitle}
          </div>

          {/* Quick toggle for registration */}
          <div style={{ marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: "1rem", background: "rgba(255,255,255,0.05)", padding: "6px 16px", borderRadius: "999px" }}>
            <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
              Estado del Registro QR: <strong>{session.is_registration_open ? "Abierto 🟢" : "Cerrado 🔴"}</strong>
            </span>
            <button
              onClick={() => triggerAction(session.is_registration_open ? "CLOSE_REGISTRATION" : "OPEN_REGISTRATION")}
              style={{
                background: "none",
                border: "none",
                color: "var(--yb-cyan)",
                fontWeight: 800,
                fontSize: "0.85rem",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {session.is_registration_open ? "Cerrar Ahora" : "Reabrir"}
            </button>
          </div>
        </div>

        {/* MIDDLE SECTION: ACTIVE QUESTION & ROULETTE POOL HISTORY */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          
          {/* Active Question Telemetry */}
          <div className="yb-hud-panel" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--yb-cyan)" }}>
                Pregunta en Pantalla
              </h2>
              {currentQuestion && (
                <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700 }}>
                  Dificultad: {currentQuestion.difficulty}
                </span>
              )}
            </div>

            {currentQuestion ? (
              <div>
                <div style={{ fontSize: "0.85rem", color: currentQuestion.category_color, fontWeight: 800, marginBottom: "6px" }}>
                  {currentQuestion.category_name}
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", lineHeight: 1.4 }}>
                  {currentQuestion.text}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {currentQuestion.options?.map((opt: any) => {
                    const isCorrect = currentQuestion.correct_option_id === opt.id;
                    const stat = data.answerStats?.find((s: any) => s.selected_option_id === opt.id);
                    const votes = stat ? parseInt(stat.count, 10) : 0;
                    const pct = answeredCount > 0 ? Math.round((votes / answeredCount) * 100) : 0;

                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          background: isCorrect ? "rgba(0, 245, 155, 0.15)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isCorrect ? "var(--yb-green)" : "rgba(255,255,255,0.08)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          fontSize: "0.9rem",
                        }}
                      >
                        <div>
                          <strong style={{ color: isCorrect ? "var(--yb-green)" : "var(--yb-cyan)" }}>
                            {opt.id}.
                          </strong>{" "}
                          {opt.text}
                        </div>
                        {isCorrect && (
                          <span style={{ padding: "2px 8px", borderRadius: "6px", background: "var(--yb-green)", color: "#000", fontWeight: 900, fontSize: "0.7rem" }}>
                            CORRECTA
                          </span>
                        )}
                        {status === "QUESTION_REVEAL" && (
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700 }}>
                            {votes} ({pct}%)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                Sin pregunta activa. Al presionar <strong>Girar Ruleta</strong> se elegirá una categoría y pregunta del banco.
              </div>
            )}
          </div>

          {/* Categories in Roulette Pool (Used vs Remaining) */}
          <div className="yb-hud-panel" style={{ padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--yb-gold)", marginBottom: "1rem" }}>
              Estado del Banco de la Ruleta
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>
              Las categorías ya jugadas se descartan automáticamente de la ruleta:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {remainingPerCategory?.map((cat: any) => {
                const count = parseInt(cat.remaining, 10);
                const isExhausted = count === 0;

                return (
                  <div
                    key={cat.id}
                    style={{
                      padding: "0.6rem 1rem",
                      borderRadius: "10px",
                      background: isExhausted ? "rgba(255, 51, 102, 0.08)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isExhausted ? "rgba(255, 51, 102, 0.3)" : "rgba(255,255,255,0.08)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isExhausted ? "#94a3b8" : "#fff" }}>
                      {cat.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        padding: "2px 10px",
                        borderRadius: "999px",
                        background: isExhausted ? "rgba(255, 51, 102, 0.2)" : "rgba(0, 111, 245, 0.2)",
                        color: isExhausted ? "var(--yb-red)" : "var(--yb-cyan)",
                      }}
                    >
                      {isExhausted ? "Agotada en Ruleta" : `${count} disponibles`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Questions Played History */}
            {playedQuestions?.length > 0 && (
              <div style={{ marginTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>
                  Preguntas ya jugadas ({playedQuestions.length}):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
                  {playedQuestions.map((pq: any, i: number) => (
                    <div key={pq.id} style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                      ✓ <strong>Ronda {i + 1} ({pq.category_name}):</strong> {pq.text.slice(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ADVANCED & EMERGENCY RESET */}
        <div className="yb-hud-panel" style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={18} color="#94a3b8" />
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#cbd5e1" }}>
                Zona de Seguridad & Reinicio de Emergencia
              </span>
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: "none",
                border: "none",
                color: "var(--yb-cyan)",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showAdvanced ? "Ocultar" : "Mostrar Opciones"}
            </button>
          </div>

          {showAdvanced && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>
                Si necesitás reiniciar la partida a cero para un ensayo o borrar puntajes de prueba:
              </p>
              <button
                disabled={isActionLoading}
                onClick={() => {
                  if (confirm("¿Estás seguro de reiniciar la partida completa? Se borrarán todos los puntajes y respuestas.")) {
                    triggerAction("RESET_GAME");
                  }
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "12px",
                  background: "rgba(255, 51, 102, 0.15)",
                  border: "1px solid var(--yb-red)",
                  color: "var(--yb-red)",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                ⚠️ Reiniciar Juego Completo (Puntajes y Rondas a 0)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
