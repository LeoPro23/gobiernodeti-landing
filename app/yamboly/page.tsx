"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clock, CheckCircle2, Award, Scale, Gift, Check, Sparkles } from "lucide-react";
import { ConfettiCanvas } from "./components/ConfettiCanvas";
import "./yamboly.css";
import { HowToPlay } from "./how-to-play";

const fieldLabelStyle: React.CSSProperties = { display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "6px", color: "var(--yb-text-body)" };
const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.95rem 1rem",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1.5px solid rgba(148, 163, 184, 0.35)",
  color: "var(--yb-text-title)",
  fontSize: "1rem",
  outline: "none",
};
const primaryButtonStyle: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "1.1rem",
  borderRadius: "16px",
  background: "linear-gradient(135deg, var(--yb-primary) 0%, var(--yb-cyan) 100%)",
  color: "#fff",
  fontWeight: 900,
  fontSize: "1.1rem",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(230, 0, 126, 0.3)",
};
const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--yb-primary)",
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: "pointer",
  padding: "0.5rem",
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudo completar la inscripción.");
  return json;
}

function legacyToken() {
  try { return localStorage.getItem("yamboly_token") || ""; } catch { return ""; }
}

export default function YambolyParticipantPage() {
  // Registro en dos pasos: DNI y luego confirmar el nombre (inscritos del Fullday) o escribir nombre y correo.
  const [registerStep, setRegisterStep] = useState<"dni" | "confirm" | "details">("dni");
  const [dni, setDni] = useState("");
  const [foundName, setFoundName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [data, setData] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSendingAnswer, setIsSendingAnswer] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerTotal, setTimerTotal] = useState<number>(1);
  const clockOffset = useRef(0);

  // Poll state every 650ms for snappy real-time responsiveness
  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const savedToken = legacyToken();
        const tokenQuery = savedToken ? `&token=${encodeURIComponent(savedToken)}` : "";
        const res = await fetch(`/api/yamboly/state?t=${Date.now()}${tokenQuery}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted) {
          clockOffset.current = Date.parse(json.serverTime) - Date.now();
          setData(json);

          // Reset selection on new question / reading phase
          if (json.session?.status === "QUESTION_READY") {
            setSelectedOption(null);
          }
        }
      } catch (err) {
        // silent retry
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 650);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Synchronized countdown timer for player mobile screen
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

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    if (!/^\d{8,12}$/.test(dni)) {
      setRegisterError("Ingresa un DNI válido de 8 a 12 dígitos.");
      return;
    }
    setIsSubmittingRegister(true);
    try {
      const result = await postJson("/api/yamboly/register/lookup", { dni });
      if (result.recovered) {
        try { localStorage.removeItem("yamboly_token"); } catch { /* La cookie identifica al participante. */ }
        const stateRes = await fetch(`/api/yamboly/state?t=${Date.now()}`, { cache: "no-store", credentials: "include" });
        if (!stateRes.ok) throw new Error("No se pudo recuperar tu participación. Intenta nuevamente.");
        setData(await stateRes.json());
      } else if (result.found) {
        setFoundName(result.fullName);
        setRegisterStep("confirm");
      } else {
        setRegisterStep("details");
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "No se pudo consultar el DNI.");
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  const completeRegistration = async (body: { dni: string; fullName?: string; email?: string }) => {
    setRegisterError(null);
    setIsSubmittingRegister(true);
    try {
      await postJson("/api/yamboly/register", body);
      try { localStorage.removeItem("yamboly_token"); } catch { /* La cookie identifica al participante. */ }
      // Refresh state immediately
      const stateRes = await fetch(`/api/yamboly/state?t=${Date.now()}`, { cache: "no-store", credentials: "include" });
      setData(await stateRes.json());
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "No se pudo completar la inscripción.");
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  const changeDni = () => {
    setRegisterStep("dni");
    setFoundName("");
    setRegisterError(null);
  };

  const handleSelectOption = async (optionId: string) => {
    if (!data?.session || data.session.status !== "QUESTION_ANSWERING" || data.session.paused_at) return;
    if (data.hasAnsweredCurrentQuestion || isSendingAnswer) return;

    setSelectedOption(optionId);
    setIsSendingAnswer(true);

    // Haptic feedback
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
    } catch (e) {}

    try {
      const res = await fetch("/api/yamboly/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: data.session.current_question_id,
          selectedOptionId: optionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al enviar respuesta");

      // Update state
      const storedToken = legacyToken();
      const tokenQuery = storedToken ? `?token=${encodeURIComponent(storedToken)}&t=${Date.now()}` : `?t=${Date.now()}`;
      const stateRes = await fetch(`/api/yamboly/state${tokenQuery}`, { cache: "no-store" });
      const stateJson = await stateRes.json();
      setData(stateJson);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSendingAnswer(false);
    }
  };

  const participant = data?.participant;
  const session = data?.session;
  const currentQuestion = data?.currentQuestion;
  const participantAnswer = data?.participantCurrentAnswer;
  const prizes = data?.prizes;
  const pointsPerCorrect = data?.settings?.pointsPerCorrect ?? 4;
  const howToSettings = {
    readingSec: data?.settings?.readingDurationSec ?? 8,
    answeringSec: data?.settings?.answeringDurationSec ?? 20,
    points: pointsPerCorrect,
  };
  const prizePlaces = Number(data?.prizePlaces ?? 3);
  const inTiebreak = (session?.tiebreak_round || 0) > 0;
  const isContender = Boolean(participant?.is_tiebreak_contender);
  const tiebreakContenders: { id: number; full_name: string }[] = data?.tiebreak?.contenders ?? [];
  const spectatingTiebreak =
    inTiebreak && !isContender && ["QUESTION_READY", "QUESTION_READING", "QUESTION_ANSWERING", "QUESTION_REVEAL"].includes(session?.status);

  const isWinner = session?.status === "PODIUM" && participant?.rank && participant.rank <= prizePlaces;
  const prizeForMe = prizes?.find((p: any) => p.place === participant?.rank);

  return (
    <div className="yb-root" suppressHydrationWarning>
      {/* Mobile Confetti celebration for winners */}
      <ConfettiCanvas active={isWinner} />

      <div className="yb-mobile-container" suppressHydrationWarning>
        {/* Top Header Mobile */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 0",
            marginBottom: "1rem",
            borderBottom: "1.5px solid rgba(230, 0, 126, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sponsor/yamboli.jpg"
              alt="Logo Yámboly"
              style={{ height: "34px", width: "auto", borderRadius: "8px", objectFit: "contain", background: "#fff", padding: "2px", border: "1px solid rgba(230,0,126,0.2)" }}
            />
            <span style={{ fontSize: "0.95rem", color: "var(--yb-primary)", fontWeight: 900 }}>
              QUIZ YÁMBOLY
            </span>
          </div>

          {participant && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, rgba(230, 0, 126, 0.1) 0%, rgba(0, 163, 224, 0.1) 100%)",
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1.5px solid rgba(230, 0, 126, 0.25)",
              }}
            >
              <Award size={18} color="var(--yb-gold)" />
              <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--yb-text-title)" }}>
                {participant.score} <span style={{ fontSize: "0.8rem", color: "var(--yb-primary)" }}>pts</span>
              </span>
            </div>
          )}
        </header>

        {/* STEP 1: REGISTRATION FORM */}
        {!participant ? (
          <>
          <div className="yb-hud-panel" style={{ padding: "2.25rem 1.5rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "0.25rem", color: "var(--yb-text-title)" }}>
                Únete a la Dinámica
              </h1>
              <p style={{ fontSize: "0.95rem", color: "var(--yb-text-muted)", marginTop: "0.4rem" }}>
                Compite en vivo desde tu celular por los premios oficiales de Helados Yámboly.
              </p>
            </div>

            {registerError && (
              <div
                style={{
                  padding: "0.85rem",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid var(--yb-red)",
                  borderRadius: "14px",
                  color: "#dc2626",
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                }}
              >
                {registerError}
              </div>
            )}

            {registerStep === "dni" && (
              <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div>
                  <label htmlFor="yb-dni" style={fieldLabelStyle}>DNI *</label>
                  <input
                    id="yb-dni"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    maxLength={12}
                    placeholder="Ej. 12345678"
                    value={dni}
                    onChange={(e) => { setDni(e.target.value.replace(/\D/g, "")); setRegisterError(null); }}
                    style={fieldInputStyle}
                  />
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--yb-text-muted)", lineHeight: 1.4 }}>
                  Si te inscribiste en el Fullday, entrarás con los datos de tu inscripción.
                </p>
                <button type="submit" disabled={isSubmittingRegister} style={primaryButtonStyle}>
                  {isSubmittingRegister ? "Buscando..." : "Continuar"}
                </button>
              </form>
            )}

            {registerStep === "confirm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.95rem", color: "var(--yb-text-muted)" }}>Encontramos tu inscripción al Fullday. ¿Eres tú?</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.25, wordBreak: "break-word", color: "var(--yb-text-title)" }}>{foundName}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--yb-text-muted)", lineHeight: 1.4 }}>
                  Tu nombre se mostrará en el ranking. Conserva este navegador para mantener tu participación.
                </p>
                <button type="button" disabled={isSubmittingRegister} onClick={() => completeRegistration({ dni })} style={primaryButtonStyle}>
                  {isSubmittingRegister ? "Registrando..." : "Sí, soy yo · Entrar"}
                </button>
                <button type="button" disabled={isSubmittingRegister} onClick={changeDni} style={linkButtonStyle}>
                  No soy yo, corregir el DNI
                </button>
              </div>
            )}

            {registerStep === "details" && (
              <form
                onSubmit={(e) => { e.preventDefault(); completeRegistration({ dni, fullName, email }); }}
                style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
              >
                <p style={{ fontSize: "0.9rem", color: "var(--yb-text-muted)", lineHeight: 1.4 }}>
                  No encontramos el DNI <strong>{dni}</strong> en la inscripción del Fullday. Completa tus datos para participar.
                </p>
                <div>
                  <label htmlFor="yb-name" style={fieldLabelStyle}>Nombres y apellidos *</label>
                  <input id="yb-name" type="text" required maxLength={200} autoComplete="name" placeholder="Ej. Ana Torres" value={fullName} onChange={(e) => setFullName(e.target.value)} style={fieldInputStyle} />
                </div>
                <div>
                  <label htmlFor="yb-email" style={fieldLabelStyle}>Correo electrónico *</label>
                  <input id="yb-email" type="email" required maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldInputStyle} />
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--yb-text-muted)", lineHeight: 1.4 }}>
                  Usaremos estos datos para identificar a los participantes y coordinar la premiación. Tu nombre se mostrará en el ranking. Conserva este navegador para mantener tu participación.
                </p>
                <button type="submit" disabled={isSubmittingRegister} style={primaryButtonStyle}>
                  {isSubmittingRegister ? "Registrando..." : "Entrar a la Dinámica"}
                </button>
                <button type="button" disabled={isSubmittingRegister} onClick={changeDni} style={linkButtonStyle}>
                  Corregir el DNI
                </button>
              </form>
            )}
          </div>
          <HowToPlay settings={howToSettings} />
          </>
        ) : (
          /* STEP 2: ACTIVE GAME INTERFACE FOR REGISTERED PLAYER */
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* LOBBY OR ROULETTE STAGE */}
            {["WAITING_REGISTRATION", "ROULETTE"].includes(session?.status) && (
              <div className="yb-hud-panel" style={{ padding: "2.5rem 1.5rem", textAlign: "center", margin: "auto 0" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>
                  {session.status === "ROULETTE" ? "🎡" : "⏳"}
                </div>
                <span className="yb-badge-live" style={{ marginBottom: "0.5rem" }}>
                  {session.status === "ROULETTE" ? "SORTEO EN VIVO" : "SALA DE ESPERA"}
                </span>
                <h2 style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "0.5rem", color: "var(--yb-text-title)" }}>
                  {session.status === "ROULETTE"
                    ? "¡Mira la Ruleta en la Pantalla!"
                    : "¡Todo Listo para Empezar!"}
                </h2>
                <p style={{ color: "var(--yb-text-muted)", fontSize: "1rem", marginTop: "0.5rem", lineHeight: 1.4 }}>
                  {session.status === "ROULETTE"
                    ? "El moderador está sorteando la categoría de la ronda. En breve se abrirá tu pantalla para responder."
                    : `Bienvenido(a) ${participant.full_name}. Mantén tu celular activo: el juego comenzará en breve.`}
                </p>

                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1rem",
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1.5px solid rgba(148, 163, 184, 0.25)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", color: "var(--yb-text-muted)" }}>Tu Código de Jugador:</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--yb-primary)", letterSpacing: "1px" }}>
                    #{participant.id.toString().padStart(4, "0")}
                  </div>
                </div>
              </div>
            )}
            {session?.status === "WAITING_REGISTRATION" && <HowToPlay settings={howToSettings} registered />}

            {/* SPECTATING TIEBREAK NOTICE */}
            {spectatingTiebreak && (
              <div className="yb-hud-panel" style={{ padding: "2.5rem 1.5rem", textAlign: "center", margin: "auto 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⚖️</div>
                <span className="yb-badge-live" style={{ marginBottom: "0.5rem" }}>DESEMPATE EN CURSO</span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--yb-gold)" }}>
                  Ronda de Desempate
                </h2>
                <p style={{ color: "var(--yb-text-body)", fontSize: "1rem", margin: "0.75rem 0" }}>
                  Esta pregunta es exclusiva para los participantes empatados en puestos premiados:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "1rem 0" }}>
                  {tiebreakContenders.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "8px 12px",
                        background: "#ffffff",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 183, 3, 0.5)",
                        fontWeight: 800,
                      }}
                    >
                      {c.full_name}
                    </div>
                  ))}
                </div>
                {!isContender && (
                  <div style={{ marginTop: "1.25rem", fontSize: "1rem", color: "var(--yb-cyan)", fontWeight: 800 }}>
                    Tu puntaje acumulado: {participant.score} puntos
                  </div>
                )}
                <p style={{ color: "var(--yb-text-muted)", fontSize: "0.88rem" }}>
                  Observa la pantalla del auditorio para ver la resolución del desempate.
                </p>
              </div>
            )}

            {/* ROULETTE VIEW ON PHONE */}
            {session?.status === "ROULETTE" && (
              <div className="yb-hud-panel" style={{ padding: "3rem 1.5rem", textAlign: "center", margin: "auto 0" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem", animation: "spin 2s linear infinite" }}>
                  🎡
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 900 }}>¡Girando la Ruleta!</h2>
                <p style={{ color: "var(--yb-text-muted)", fontSize: "1rem", marginTop: "0.5rem" }}>
                  Observa la pantalla principal para descubrir el tema de la Ronda {session.current_round}.
                </p>
              </div>
            )}

            {/* QUESTION READING PHASE - UNIFIED CARD */}
            {["QUESTION_READY", "QUESTION_READING"].includes(session?.status) && currentQuestion && !spectatingTiebreak && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div
                  className="yb-hud-panel"
                  style={{
                    padding: "2.25rem 1.5rem",
                    border: "2px solid rgba(255, 183, 3, 0.4)",
                    background: "linear-gradient(135deg, #ffffff 0%, #fffdf5 100%)",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "1.25rem",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        padding: "5px 14px",
                        borderRadius: "999px",
                        background: inTiebreak ? "rgba(255, 183, 3, 0.18)" : `${currentQuestion.category_color}18`,
                        color: inTiebreak ? "#b45309" : currentQuestion.category_color,
                        fontSize: "0.85rem",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {inTiebreak ? "⚖️ DESEMPATE · LECTURA" : currentQuestion.category_name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(255, 183, 3, 0.18)",
                        border: "1.5px solid var(--yb-gold)",
                        padding: "5px 14px",
                        borderRadius: "999px",
                        fontSize: "1.1rem",
                        fontWeight: 900,
                        color: "#b45309",
                      }}
                    >
                      <Clock size={16} />
                      {session.status === "QUESTION_READY" ? "Lectura pendiente" : session.paused_at ? `Pausado · ${timerRemaining}s` : timerRemaining > 0 ? `${timerRemaining}s` : "¡Votación lista!"}
                    </div>
                  </div>

                  <div className="yb-timer-bar-wrap" style={{ height: "8px", margin: "0 0 1.5rem 0" }}>
                    <div
                      className="yb-timer-bar-fill"
                      style={{ width: `${(timerRemaining / (timerTotal || 1)) * 100}%`, backgroundColor: "var(--yb-gold)" }}
                    />
                  </div>

                  <h3
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 800,
                      lineHeight: 1.4,
                      color: "var(--yb-text-title)",
                      margin: "0 0 1.25rem 0",
                    }}
                  >
                    {currentQuestion.text}
                  </h3>

                  <div style={{ fontSize: "0.85rem", color: "var(--yb-text-muted)", fontWeight: 700 }}>
                    💡 Analiza la pregunta con atención; las opciones se habilitarán en breve.
                  </div>
                </div>
              </div>
            )}

            {/* QUESTION ANSWERING PHASE */}
            {session?.status === "QUESTION_ANSWERING" && currentQuestion && !spectatingTiebreak && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem" }}>
                {/* Timer Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--yb-primary)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    {inTiebreak ? "⚖️ PREGUNTA DE DESEMPATE" : `Ronda ${session.current_round} · Marca tu respuesta`}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: timerRemaining <= 5 ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 163, 224, 0.12)",
                      border: `1.5px solid ${timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)"}`,
                      padding: "6px 16px",
                      borderRadius: "999px",
                      fontSize: "1.3rem",
                      fontWeight: 900,
                      color: timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)",
                    }}
                  >
                    <Clock size={18} />
                    {session.paused_at ? `Pausado · ${timerRemaining}s` : `${timerRemaining}s`}
                  </div>
                </div>

                {/* Timer Bar */}
                <div className="yb-timer-bar-wrap" style={{ height: "10px", margin: "0" }}>
                  <div
                    className="yb-timer-bar-fill"
                    style={{
                      width: `${(timerRemaining / (timerTotal || 1)) * 100}%`,
                      backgroundColor: timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)",
                    }}
                  />
                </div>

                <div className="yb-hud-panel" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, lineHeight: 1.35, color: "var(--yb-text-title)" }}>
                    {currentQuestion.text}
                  </h3>
                </div>

                {data.hasAnsweredCurrentQuestion ? (
                  <div className="yb-hud-panel" style={{ padding: "2.25rem 1.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>⚡</div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--yb-primary)" }}>
                      ¡Respuesta {selectedOption || participantAnswer?.selected_option_id} Enviada!
                    </h3>
                    <p style={{ color: "var(--yb-text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                      Tu voto está bloqueado. En <strong>{timerRemaining}s</strong> se revelará si acertaste en verde o rojo.
                    </p>
                  </div>
                ) : timerRemaining <= 0 && !session.paused_at ? (
                  <p className="yb-hud-panel" style={{ padding: "1.25rem", textAlign: "center" }}>La votación terminó. Espera la revelación de la respuesta.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {currentQuestion.options?.map((opt: any) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        disabled={isSendingAnswer || !!session.paused_at}
                        className={`yb-mobile-btn ${selectedOption === opt.id ? "is-selected" : ""}`}
                        style={{
                          borderLeft: `6px solid ${
                            opt.id === "A"
                              ? "var(--opt-a)"
                              : opt.id === "B"
                              ? "var(--opt-b)"
                              : opt.id === "C"
                              ? "var(--opt-c)"
                              : "var(--opt-d)"
                          }`,
                        }}
                      >
                        <span
                          className={`yb-option-letter yb-letter-${opt.id}`}
                          style={{ width: "40px", height: "40px", borderRadius: "10px", fontSize: "1.2rem" }}
                        >
                          {opt.id}
                        </span>
                        <span style={{ flex: 1, textAlign: "left", color: "var(--yb-text-title)" }}>{opt.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUESTION REVEAL */}
            {session?.status === "QUESTION_REVEAL" && currentQuestion && !spectatingTiebreak && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem" }}>
                {/* Result Hero Banner */}
                <div
                  className="yb-hud-panel"
                  style={{
                    padding: "1.75rem 1.5rem",
                    textAlign: "center",
                    border: `2px solid ${participantAnswer?.is_correct ? "var(--yb-green)" : "var(--yb-red)"}`,
                    background: participantAnswer?.is_correct
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                    boxShadow: `0 10px 30px ${participantAnswer?.is_correct ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.15)"}`,
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
                    {participantAnswer?.is_correct ? "🎉" : "❌"}
                  </div>
                  <h2
                    style={{
                      fontSize: "1.75rem",
                      fontWeight: 900,
                      color: participantAnswer?.is_correct ? "var(--yb-green)" : "var(--yb-red)",
                    }}
                  >
                    {participantAnswer?.is_correct
                      ? inTiebreak
                        ? "¡Acertaste el desempate!"
                        : `¡Acertaste! +${pointsPerCorrect} PUNTOS`
                      : "¡No acertaste esta vez!"}
                  </h2>
                  <p style={{ color: "var(--yb-text-title)", fontSize: "0.95rem", marginTop: "0.4rem", fontWeight: 700 }}>
                    {participantAnswer?.is_correct
                      ? "¡Excelente velocidad y precisión!"
                      : `La respuesta correcta era la opción ${currentQuestion.correct_option_id}`}
                  </p>
                </div>

                {/* Visual Options breakdown in Mobile: Green for Correct, Red for user's wrong pick */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {currentQuestion.options?.map((opt: any) => {
                    const isCorrect = currentQuestion.correct_option_id === opt.id;
                    const isMyPick = participantAnswer?.selected_option_id === opt.id;

                    let btnClass = "yb-mobile-btn";
                    if (isCorrect) btnClass += " is-revealed-correct";
                    else if (isMyPick) btnClass += " is-revealed-wrong";

                    return (
                      <div
                        key={opt.id}
                        className={btnClass}
                        style={{
                          opacity: !isCorrect && !isMyPick ? 0.5 : 1,
                        }}
                      >
                        <span
                          className={`yb-option-letter yb-letter-${opt.id}`}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            fontSize: "1.1rem",
                            backgroundColor: isCorrect ? "var(--yb-green)" : isMyPick ? "var(--yb-red)" : undefined,
                            color: "#ffffff",
                          }}
                        >
                          {opt.id}
                        </span>

                        <div style={{ flex: 1 }}>
                          <div style={{ color: "var(--yb-text-title)" }}>{opt.text}</div>
                          {isCorrect && (
                            <div style={{ fontSize: "0.78rem", color: "var(--yb-green)", fontWeight: 800 }}>
                              ✓ RESPUESTA CORRECTA
                            </div>
                          )}
                          {isMyPick && !isCorrect && (
                            <div style={{ fontSize: "0.78rem", color: "var(--yb-red)", fontWeight: 800 }}>
                              ✗ TU ELECCIÓN
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {currentQuestion.explanation && (
                  <div className="yb-answer-explanation yb-answer-explanation-mobile" role="note">
                    <CheckCircle2 size={20} aria-hidden="true" style={{ flexShrink: 0, color: "var(--yb-green)" }} />
                    <p>{currentQuestion.explanation}</p>
                  </div>
                )}

                {/* Score Counter */}
                <div
                  className="yb-hud-panel"
                  style={{
                    padding: "0.9rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "0.9rem", color: "var(--yb-text-muted)" }}>Puntaje Acumulado:</span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--yb-primary)" }}>
                    {participant.score} puntos
                  </span>
                </div>
              </div>
            )}

            {/* ROUND RANKING (DURING GAME) */}
            {session?.status === "ROUND_RANKING" && (
              <div className="yb-hud-panel" style={{ padding: "2.5rem 1.5rem", textAlign: "center", margin: "auto 0" }}>
                <span className="yb-badge-live" style={{ marginBottom: "0.5rem" }}>
                  {inTiebreak ? `TRAS EL DESEMPATE #${session.tiebreak_round}` : `FIN RONDA ${session.current_round}`}
                </span>
                <h2 style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "0.5rem", color: "var(--yb-text-title)" }}>
                  Tu Desempeño
                </h2>

                <div
                  style={{
                    margin: "1.5rem 0",
                    padding: "1.5rem",
                    background: "#ffffff",
                    borderRadius: "22px",
                    border: "2px solid rgba(230, 0, 126, 0.2)",
                    boxShadow: "0 8px 25px rgba(230, 0, 126, 0.08)",
                  }}
                >
                  <div style={{ fontSize: "0.9rem", color: "var(--yb-text-muted)" }}>Puesto en la Tabla General</div>
                  <div style={{ fontSize: "3.5rem", fontWeight: 900, color: "var(--yb-primary)", lineHeight: 1.1, marginTop: "4px" }}>
                    #{participant.rank ?? "-"}
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--yb-cyan)", marginTop: "6px" }}>
                    {participant.score} puntos acumulados
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--yb-text-body)", marginTop: "8px" }}>
                    {participant.correct_count} de {session.current_round} preguntas acertadas
                  </div>
                </div>

                <p style={{ color: "var(--yb-text-muted)", fontSize: "0.95rem" }}>
                  {participant.tied && session.current_round >= session.total_rounds && participant.rank <= prizePlaces
                    ? data?.tiebreak?.drawPending
                      ? "⚖️ El empate por el primer puesto se definirá mediante un sorteo externo."
                      : "⚖️ Estás en un empate técnico por un puesto premiado. Atento al celular: puede haber una pregunta de desempate."
                    : session.status === "PODIUM" && participant.rank && participant.rank <= prizePlaces
                    ? "🎉 ¡Estás en el Podio de Premios Yámboly! Acércate a la mesa de premiación."
                    : participant.rank && participant.rank <= prizePlaces
                    ? "🔥 ¡Vas en zona de premios! Mantén la concentración para las siguientes rondas."
                    : "Mira la pantalla del auditorio para ver la tabla completa."}
                </p>
              </div>
            )}

            {/* STAGE 7: FINAL PODIUM ON MOBILE (SPECTACULAR WINNER CELEBRATION OR RANK REPORT) */}
            {session?.status === "PODIUM" && (
              <div style={{ margin: "auto 0", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {isWinner ? (
                  /* ================= WINNER VIEW ================= */
                  <div
                    className="yb-hud-panel"
                    style={{
                      padding: "2rem 1.5rem",
                      textAlign: "center",
                      border: "2.5px solid var(--yb-gold)",
                      background: "linear-gradient(135deg, #ffffff 0%, #fffbf0 50%, #fff0f6 100%)",
                      boxShadow: "0 14px 40px rgba(245, 158, 11, 0.35)",
                    }}
                  >
                    <div style={{ fontSize: "3.8rem", lineHeight: 1, marginBottom: "0.5rem" }}>
                      {participant.rank === 1 ? "🥇" : participant.rank === 2 ? "🥈" : "🥉"}
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--yb-primary)", color: "#fff", padding: "4px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "0.75rem" }}>
                      <Sparkles size={14} /> ¡GANADOR OFICIAL DEL QUIZ! <Sparkles size={14} />
                    </div>

                    <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "var(--yb-text-title)", margin: "0 0 0.5rem" }}>
                      ¡Felicitaciones, {participant.full_name}!
                    </h1>

                    {/* Giant Rank Display */}
                    <div
                      style={{
                        padding: "1.25rem",
                        background: "#ffffff",
                        borderRadius: "20px",
                        border: "2px solid var(--yb-gold)",
                        margin: "1.25rem 0",
                        boxShadow: "0 8px 24px rgba(255, 183, 3, 0.2)",
                      }}
                    >
                      <div style={{ fontSize: "0.88rem", color: "var(--yb-text-muted)", textTransform: "uppercase", fontWeight: 800 }}>
                        Tu Puesto Oficial
                      </div>
                      <div style={{ fontSize: "4.5rem", fontWeight: 900, color: "var(--yb-gold)", lineHeight: 1, margin: "6px 0" }}>
                        #{participant.rank}
                      </div>
                      <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--yb-primary)" }}>
                        {participant.score} puntos acumulados
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--yb-text-body)", marginTop: "4px" }}>
                        {participant.correct_count} aciertos de {session.total_rounds} preguntas
                      </div>
                    </div>

                    {/* Prize Spotlight on Phone */}
                    <div
                      style={{
                        padding: "1.25rem",
                        background: "#ffffff",
                        borderRadius: "18px",
                        border: "1.5px solid rgba(230, 0, 126, 0.25)",
                        marginBottom: "1.25rem",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <div style={{ width: "95px", height: "80px", borderRadius: "14px", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(230,0,126,0.2)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/sponsor/premio.webp" alt="Premio Ganado" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--yb-primary)", textTransform: "uppercase" }}>
                          Tu Premio Asignado:
                        </div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--yb-text-title)" }}>
                          {prizeForMe?.title ?? "Caja de Helados Yámboly"}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "var(--yb-text-muted)", marginTop: "2px" }}>
                          {prizeForMe?.description ?? "Caja con delicioso surtido de helados Yámboly y Magneto Crunchy Vanilla"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= NON-WINNER PARTICIPANT VIEW ================= */
                  <div className="yb-hud-panel" style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>👏</div>
                    <span className="yb-badge-live" style={{ marginBottom: "0.5rem" }}>
                      GRAN FINAL
                    </span>
                    <h2 style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "0.5rem", color: "var(--yb-text-title)" }}>
                      ¡Gracias por Participar!
                    </h2>

                    <div
                      style={{
                        margin: "1.5rem 0",
                        padding: "1.5rem",
                        background: "#ffffff",
                        borderRadius: "20px",
                        border: "2px solid rgba(148, 163, 184, 0.25)",
                        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.04)",
                      }}
                    >
                      <div style={{ fontSize: "0.88rem", color: "var(--yb-text-muted)", textTransform: "uppercase", fontWeight: 800 }}>
                        Tu Puesto Final
                      </div>
                      <div style={{ fontSize: "4.2rem", fontWeight: 900, color: "var(--yb-cyan)", lineHeight: 1, margin: "6px 0" }}>
                        #{participant.rank ?? "-"}
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--yb-text-title)" }}>
                        {participant.score} puntos
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--yb-text-muted)", marginTop: "4px" }}>
                        {participant.correct_count} de {session.total_rounds} preguntas acertadas
                      </div>
                    </div>

                    <p style={{ color: "var(--yb-text-body)", fontSize: "0.95rem", lineHeight: 1.4 }}>
                      ¡Hiciste un excelente papel en el Full Day ISACA UNT 2026! Te invitamos a seguir disfrutando de las
                      conferencias y de los helados de nuestro patrocinador oficial <strong>Helados Yámboly</strong>. 🍦
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
