"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { remainingTimeMs } from "@/lib/yamboly-timer";
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
  Sparkles,
  Settings2,
  Scale
} from "lucide-react";
import "../yamboly.css";
import { ParticipantsPanel } from "./participants-panel";

function buildPhases(readingSec: number, answeringSec: number) {
  return [
    { id: "WAITING_REGISTRATION", label: "Lobby & QR", icon: Users, desc: "Inscripción abierta", action: "OPEN_REGISTRATION" },
    { id: "ROULETTE", label: "Ruleta", icon: RotateCw, desc: "Sorteo de categoría", action: "SPIN_ROULETTE" },
    { id: "QUESTION_READY", label: "Pregunta", icon: Clock, desc: "Lectura pendiente", action: "SHOW_QUESTION" },
    { id: "QUESTION_READING", label: `Lectura (${readingSec}s)`, icon: Clock, desc: "Móviles bloqueados", action: "START_READING" },
    { id: "QUESTION_ANSWERING", label: `Votación (${answeringSec}s)`, icon: Play, desc: "Votación abierta", action: "START_ANSWERING" },
    { id: "QUESTION_REVEAL", label: "Revelación", icon: CheckCircle2, desc: "Respuesta correcta", action: "REVEAL_ANSWER" },
    { id: "ROUND_RANKING", label: "Ranking", icon: Trophy, desc: "Tabla de posiciones", action: "SHOW_ROUND_RANKING" },
    { id: "TIEBREAK", label: "Desempate", icon: Scale, desc: "Solo si hay empate", action: "PREPARE_TIEBREAK" },
    { id: "PODIUM", label: "Podio Final", icon: Crown, desc: "Premiación oficial", action: "SHOW_PODIUM" },
  ];
}

export default function YambolyModeratorPage() {
  const [data, setData] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [now, setNow] = useState(0);
  const clockOffsetRef = useRef(0);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/yamboly/state");
      if (res.ok) {
        const json = await res.json();
        clockOffsetRef.current = Date.parse(json.serverTime) - Date.now();
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
    setActionError(null);
    try {
      const res = await fetch("/api/yamboly/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: { type, ...payload },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al ejecutar acción");
      await fetchState();
    } catch (err: any) {
      setActionError(err instanceof Error ? err.message : "No se pudo ejecutar la acción.");
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    const tick = () => setNow(Date.now() + clockOffsetRef.current);
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, []);

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

  const { session, currentQuestion, playedQuestions, remainingPerCategory, settings, tiebreak } = data;
  const status = session?.status;
  const isPaused = !!session?.paused_at;
  const currentRound = session?.current_round || 0;
  const totalRounds = session?.total_rounds || 5;
  const readingSec = settings?.readingDurationSec ?? 8;
  const answeringSec = settings?.answeringDurationSec ?? 20;
  const inTiebreak = (session?.tiebreak_round || 0) > 0;
  const isFinished = currentRound >= totalRounds;
  const prizePlaces = Number(data.prizePlaces || 0);
  const PHASES = buildPhases(readingSec, answeringSec);

  const participantsCount = Number(data.participantsCount || 0);
  // Durante el desempate solo responden los participantes empatados.
  const expectedAnswers = inTiebreak ? tiebreak?.contenders?.length || 0 : participantsCount;
  const answeredCount = Number(data.answeredCount || 0);
  const responseRate = expectedAnswers > 0 ? Math.round((answeredCount / expectedAnswers) * 100) : 0;
  const remaining = status === "QUESTION_READING"
    ? remainingTimeMs(session.reading_start_time, readingSec, now, session.paused_at)
    : status === "QUESTION_ANSWERING"
      ? remainingTimeMs(session.answering_start_time, answeringSec, now, session.paused_at)
      : null;
  const timerRunning = remaining !== null && remaining > 0;

  const phaseId = status === "TIEBREAK" || (inTiebreak && status !== "ROUND_RANKING" && status !== "PODIUM") ? "TIEBREAK" : status;
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === phaseId);

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
      subtitle: `Inicia la Ronda ${currentRound + 1}`,
      action: "SPIN_ROULETTE",
      color: "linear-gradient(135deg, #ff007a 0%, #ae1df5 100%)",
    };
  } else if (status === "ROULETTE") {
    nextAction = {
      title: "Mostrar pregunta 📖",
      subtitle: "La ruleta permanecerá visible hasta que muestres la pregunta.",
      action: "SHOW_QUESTION",
      color: "linear-gradient(135deg, #7928ca 0%, #006ff5 100%)",
    };
  } else if (status === "QUESTION_READY") {
    nextAction = {
      title: `Iniciar lectura (${readingSec}s)`,
      subtitle: "La pregunta está visible; las respuestas aún están bloqueadas.",
      action: "START_READING",
      color: "linear-gradient(135deg, #7928ca 0%, #006ff5 100%)",
    };
  } else if (status === "QUESTION_READING") {
    nextAction = {
      title: `Iniciar votación (${answeringSec}s) ⚡`,
      subtitle: timerRunning ? `Lectura en curso: ${Math.ceil(remaining! / 1000)}s restantes.` : "Lectura terminada. La votación espera tu indicación.",
      action: "START_ANSWERING",
      color: "linear-gradient(135deg, #00f59b 0%, #00b4d8 100%)",
    };
  } else if (status === "QUESTION_ANSWERING") {
    nextAction = {
      title: "Revelar respuesta ✓",
      subtitle: timerRunning ? `Votación en curso: ${Math.ceil(remaining! / 1000)}s · ${answeredCount} de ${expectedAnswers} respuestas.` : `Votación cerrada: ${answeredCount} de ${expectedAnswers} respuestas (${responseRate}%).`,
      action: "REVEAL_ANSWER",
      color: "linear-gradient(135deg, #006ff5 0%, #42dcff 100%)",
    };
  } else if (status === "QUESTION_REVEAL") {
    nextAction = {
      title: inTiebreak ? "Ver Resultado del Desempate ⚖️" : "Proyectar Tabla de Posiciones 🏆",
      subtitle: inTiebreak ? "Actualiza la clasificación con la pregunta de desempate" : `Ranking acumulado tras la Ronda ${currentRound}`,
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
    } else if (tiebreak?.required && tiebreak?.limitReached) {
      nextAction = {
        title: tiebreak?.drawPending ? "Empate pendiente de sorteo externo" : "Límite de desempates alcanzado",
        subtitle: tiebreak?.drawPending ? "Descarga la lista para realizar el sorteo del primer puesto." : "Hay empates pendientes en otros puestos premiados.",
        action: "SHOW_PODIUM",
        color: "linear-gradient(135deg, #ffb703 0%, #ff007a 100%)",
      };
    } else if (tiebreak?.required) {
      nextAction = {
        title: inTiebreak ? "Nuevo Desempate: Siguen Empatados ⚖️" : "Iniciar Desempate ⚖️",
        subtitle: `Empate técnico en puestos premiados: ${tiebreak.groups.map((g: any) => g.participants.map((p: any) => p.full_name).join(" vs ")).join(" · ")}`,
        action: "PREPARE_TIEBREAK",
        color: "linear-gradient(135deg, #ffb703 0%, #ff007a 100%)",
      };
    } else {
      nextAction = {
        title: "Proclamar Ganadores y Mostrar Podio Final 👑",
        subtitle: `Entrega oficial de ${prizePlaces === 1 ? "1 premio" : `${prizePlaces} premios`} Yámboly`,
        action: "SHOW_PODIUM",
        color: "linear-gradient(135deg, #ffb703 0%, #e63946 100%)",
      };
    }
  } else if (status === "TIEBREAK") {
    nextAction = {
      title: "Lanzar Pregunta de Desempate ⚡",
      subtitle: `Solo responden ${tiebreak?.contenders?.length || 0} participantes empatados · sin puntos, decide el orden`,
      action: "START_TIEBREAK_QUESTION",
      color: "linear-gradient(135deg, #ff007a 0%, #ffb703 100%)",
    };
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
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "1px" }}>{inTiebreak ? "DESEMPATE" : "RONDA"}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: inTiebreak ? "var(--yb-gold)" : "var(--yb-cyan)" }}>
                {inTiebreak ? `#${session.tiebreak_round}` : <>{currentRound} <span style={{ fontSize: "0.85rem", color: "#64748b" }}>/ {totalRounds}</span></>}
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
              href="/dashboard/yamboly"
              target="_blank"
              style={{
                padding: "0.6rem 1.1rem",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#cbd5e1",
                fontWeight: 800,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Settings2 size={15} /> Banco y premios ↗
            </Link>

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

            {/* Pause Switch */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {status !== "WAITING_REGISTRATION" && status !== "PODIUM" && (
                <button
                  onClick={() => triggerAction(isPaused ? "RESUME" : "PAUSE")}
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
                  {isPaused ? "Reanudar partida" : "Pausar partida"}
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
        {actionError && <p role="alert" style={{ color: "#ff8da8", marginBottom: "1rem" }}>{actionError}</p>}
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
            Control de avance manual
          </div>

          <button
            disabled={isActionLoading || isPaused || status === "PODIUM" || ((status === "QUESTION_READING" || status === "QUESTION_ANSWERING") && (remaining === null || timerRunning)) || (status === "ROUND_RANKING" && tiebreak?.required && tiebreak?.limitReached)}
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

        {/* AWARDS STATUS: TECHNICAL TIES AND TIEBREAK */}
        {isFinished && status !== "PODIUM" && (
          <div
            className="yb-hud-panel"
            style={{
              padding: "1.5rem 1.75rem",
              marginBottom: "1.5rem",
              borderLeft: `5px solid ${tiebreak?.required || phaseId === "TIEBREAK" ? "var(--yb-gold)" : "var(--yb-green)"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
              <Scale size={20} color="var(--yb-gold)" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 900 }}>Estado de la premiación</h2>
            </div>
            {tiebreak?.drawPending ? (
              <div>
                <p style={{ color: "#cbd5e1" }}>Tras {session.tiebreak_round} preguntas persiste el empate por el primer puesto. El premio se definirá mediante un sorteo externo; aún no hay ganador.</p>
                <ul style={{ margin: "1rem 0", paddingLeft: "1.5rem", color: "#fff" }}>
                  {tiebreak.drawParticipants.map((p: any) => <li key={p.id}>{p.full_name}</li>)}
                </ul>
                <a href="/api/yamboly/admin/empate.xlsx" className="yb-mobile-btn" style={{ display: "inline-block", textDecoration: "none" }}>Descargar participantes para sorteo (.xlsx)</a>
              </div>
            ) : tiebreak?.required && tiebreak?.limitReached && status === "ROUND_RANKING" ? (
              <p style={{ color: "#cbd5e1" }}>Se alcanzó el límite de preguntas y quedan empates en puestos premiados. Revisa la configuración de premios; la exportación para sorteo corresponde al primer puesto.</p>
            ) : phaseId === "TIEBREAK" ? (
              <p style={{ color: "#cbd5e1" }}>
                Desempate en curso entre:{" "}
                <strong>{tiebreak?.contenders?.map((p: any) => p.full_name).join(", ")}</strong>. Gana quien acierte; entre
                quienes aciertan, el más rápido. Menos de {(settings?.tieThresholdMs ?? 1000) / 1000}s de diferencia sigue
                siendo empate y requiere otra pregunta.
              </p>
            ) : tiebreak?.required ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {tiebreak.groups.map((group: any) => (
                  <p key={group.fromPosition} style={{ color: "#cbd5e1" }}>
                    <strong style={{ color: "var(--yb-gold)" }}>
                      Puestos {group.fromPosition}–{group.toPosition}:
                    </strong>{" "}
                    {group.participants.map((p: any) => p.full_name).join(" · ")}
                  </p>
                ))}
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  Empate técnico: mismos puntos y aciertos por dificultad, y menos de{" "}
                  {(settings?.tieThresholdMs ?? 1000) / 1000}s de diferencia. Preguntas de desempate: {session.tiebreak_round} de {settings?.maxTiebreakQuestions ?? 3}.
                </p>
              </div>
            ) : (
              <p style={{ color: "var(--yb-green)", fontWeight: 700 }}>
                Sin empates en {prizePlaces === 1 ? "el puesto premiado" : `los ${prizePlaces} puestos premiados`}. Puedes publicar el podio.
              </p>
            )}
          </div>
        )}

        {/* MIDDLE SECTION: ACTIVE QUESTION & ROULETTE POOL HISTORY */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          
          {/* Active Question Telemetry */}
          <div className="yb-hud-panel" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: inTiebreak ? "var(--yb-gold)" : "var(--yb-cyan)" }}>
                {inTiebreak ? `Pregunta de Desempate #${session.tiebreak_round}` : "Pregunta en Pantalla"}
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

        <ParticipantsPanel />

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
