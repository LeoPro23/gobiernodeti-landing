"use client";

import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, Award, Scale } from "lucide-react";
import "./yamboly.css";

export default function YambolyParticipantPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [data, setData] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSendingAnswer, setIsSendingAnswer] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerTotal, setTimerTotal] = useState<number>(1);

  // Poll state every 1 second for snappy mobile responsiveness
  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch("/api/yamboly/state");
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted) {
          setData(json);

          // Reset selection on new question / reading phase
          if (json.session?.status === "QUESTION_READING") {
            setSelectedOption(null);
          }
        }
      } catch (err) {
        // silent retry
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
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
      const timerInt = setInterval(() => {
        const elapsed = (session.paused_at ? new Date(session.paused_at).getTime() : Date.now()) - start;
        const left = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        setTimerRemaining(left);
      }, 250);
      return () => clearInterval(timerInt);
    } else {
      setTimerRemaining(0);
    }
  }, [data?.session?.status, data?.session?.reading_start_time, data?.session?.answering_start_time, data?.session?.paused_at]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setIsSubmittingRegister(true);

    try {
      const res = await fetch("/api/yamboly/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al registrarse");

      // Refresh state immediately
      const stateRes = await fetch("/api/yamboly/state");
      const stateJson = await stateRes.json();
      setData(stateJson);
    } catch (err: any) {
      setRegisterError(err.message);
    } finally {
      setIsSubmittingRegister(false);
    }
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
      const stateRes = await fetch("/api/yamboly/state");
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
  const pointsPerCorrect = data?.settings?.pointsPerCorrect ?? 4;
  const prizePlaces = Number(data?.prizePlaces ?? 3);
  const inTiebreak = (session?.tiebreak_round || 0) > 0;
  const isContender = Boolean(participant?.is_tiebreak_contender);
  const tiebreakContenders: { id: number; full_name: string }[] = data?.tiebreak?.contenders ?? [];
  // Durante el desempate, quien no está empatado solo observa.
  const spectatingTiebreak =
    inTiebreak && !isContender && ["QUESTION_READING", "QUESTION_ANSWERING", "QUESTION_REVEAL"].includes(session?.status);

  return (
    <div className="yb-root">
      <div className="yb-mobile-container">
        
        {/* Top Header Mobile */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 0",
            marginBottom: "1rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sponsor/yamboli.jpg"
              alt="Logo Yámboly"
              style={{ height: "32px", width: "auto", borderRadius: "6px", objectFit: "contain", background: "#fff", padding: "2px" }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--yb-cyan)", fontWeight: 800 }}>
              QUIZ
            </span>
          </div>

          {participant && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0, 111, 245, 0.25)",
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid var(--yb-border)",
              }}
            >
              <Award size={16} color="var(--yb-gold)" />
              <span style={{ fontSize: "1.05rem", fontWeight: 900, color: "#fff" }}>
                {participant.score} <span style={{ fontSize: "0.75rem", color: "var(--yb-cyan)" }}>pts</span>
              </span>
            </div>
          )}
        </header>

        {/* STEP 1: REGISTRATION FORM */}
        {!participant ? (
          <div className="yb-hud-panel" style={{ padding: "2.25rem 1.5rem", marginTop: "auto", marginBottom: "auto" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <span className="yb-badge-live" style={{ marginBottom: "0.5rem" }}>
                INSCRIPCIÓN RÁPIDA
              </span>
              <h1 style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "0.25rem" }}>
                Únete a la Dinámica
              </h1>
              <p style={{ fontSize: "0.95rem", color: "#94a3b8", marginTop: "0.4rem" }}>
                Compite en vivo desde tu celular por los premios oficiales de Yámboly.
              </p>
            </div>

            {registerError && (
              <div
                style={{
                  padding: "0.85rem",
                  background: "rgba(255, 51, 102, 0.15)",
                  border: "1px solid var(--yb-red)",
                  borderRadius: "14px",
                  color: "#ff8da8",
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                }}
              >
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "6px", color: "#cbd5e1" }}>
                  Nombres completos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ronald Melgarejo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.95rem 1rem",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </div>

              <label>Correo electrónico *<input aria-label="Correo electrónico" type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} className="yb-mobile-btn" /></label>
              <label>Número de teléfono *<input aria-label="Número de teléfono" type="tel" required maxLength={50} value={phone} onChange={(e) => setPhone(e.target.value)} className="yb-mobile-btn" /></label>
              <p>Usaremos estos datos para identificar a los participantes y coordinar la premiación. Tu nombre se mostrará en el ranking. Conserva este navegador para mantener tu participación.</p>

              <button
                type="submit"
                disabled={isSubmittingRegister}
                style={{
                  marginTop: "0.5rem",
                  padding: "1.1rem",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, var(--yb-blue) 0%, var(--yb-purple) 100%)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 30px rgba(0, 111, 245, 0.5)",
                }}
              >
                {isSubmittingRegister ? "Registrando..." : "Entrar a la Dinámica"}
              </button>
            </form>
          </div>
        ) : (
          /* STEP 2: PARTICIPANT GAME VIEWS */
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            
            {/* LOBBY / WAITING */}
            {session?.status === "WAITING_REGISTRATION" && (
              <div className="yb-hud-panel" style={{ padding: "2.75rem 1.5rem", textAlign: "center", margin: "auto 0" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🍦</div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 900 }}>¡Estás dentro, {participant.full_name}!</h2>
                <p style={{ color: "#94a3b8", fontSize: "1rem", marginTop: "0.5rem", lineHeight: 1.4 }}>
                  Mira la pantalla gigante del auditorio. En breve se girará la Ruleta Yámboly para la Ronda 1.
                </p>
                <div
                  style={{
                    marginTop: "1.75rem",
                    padding: "1rem 1.25rem",
                    background: "rgba(0, 245, 155, 0.12)",
                    border: "1px solid var(--yb-green)",
                    borderRadius: "14px",
                    color: "var(--yb-green)",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={18} />
                  Inscripción confirmada
                </div>
              </div>
            )}

            {/* TIEBREAK: ANNOUNCEMENT OR SPECTATOR VIEW */}
            {(session?.status === "TIEBREAK" || spectatingTiebreak) && (
              <div
                className="yb-hud-panel"
                style={{
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  margin: "auto 0",
                  border: `1.5px solid ${isContender ? "var(--yb-gold)" : "var(--yb-border)"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
                  <Scale size={48} color="var(--yb-gold)" />
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: isContender ? "var(--yb-gold)" : "#fff" }}>
                  {isContender ? "¡Estás en el desempate!" : "Desempate en curso"}
                </h2>
                <p style={{ color: "#cbd5e1", fontSize: "1rem", marginTop: "0.6rem", lineHeight: 1.45 }}>
                  {isContender
                    ? "Empataste en un puesto premiado. Responde la pregunta adicional: gana quien acierte y, entre quienes aciertan, el más rápido. No suma puntos."
                    : `Solo responden los participantes empatados: ${tiebreakContenders.map((p) => p.full_name).join(", ")}. Mira la pantalla del auditorio.`}
                </p>
                {!isContender && (
                  <div style={{ marginTop: "1.25rem", fontSize: "1rem", color: "var(--yb-cyan)", fontWeight: 800 }}>
                    Tu puntaje final: {participant.score} puntos
                  </div>
                )}
              </div>
            )}

            {/* ROULETTE VIEW ON PHONE */}
            {session?.status === "ROULETTE" && (
              <div className="yb-hud-panel" style={{ padding: "3rem 1.5rem", textAlign: "center", margin: "auto 0" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem", animation: "spin 2s linear infinite" }}>
                  🎡
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 900 }}>¡Girando la Ruleta!</h2>
                <p style={{ color: "#94a3b8", fontSize: "1rem", marginTop: "0.5rem" }}>
                  Observa la pantalla principal para descubrir el tema de la Ronda {session.current_round}.
                </p>
              </div>
            )}

            {/* QUESTION READING WITH VISIBLE COUNTDOWN (LOCKED) */}
            {session?.status === "QUESTION_READING" && currentQuestion && !spectatingTiebreak && (
              <div className="yb-hud-panel" style={{ padding: "1.75rem 1.25rem", margin: "auto 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "10px",
                      background: "rgba(174, 29, 245, 0.25)",
                      border: "1px solid var(--yb-purple)",
                      color: "#d8b4fe",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                    }}
                  >
                    {inTiebreak ? "⚖️ DESEMPATE · LECTURA" : "🔒 LECTURA (Móviles en espera)"}
                  </span>
                  
                  {/* Countdown Badge on Player Mobile */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(174, 29, 245, 0.2)",
                      border: "1px solid var(--yb-purple)",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      fontSize: "1rem",
                      fontWeight: 900,
                      color: "#d8b4fe",
                    }}
                  >
                    <Clock size={16} />
                    {timerRemaining}s
                  </div>
                </div>

                <div className="yb-timer-bar-wrap" style={{ height: "10px", marginBottom: "1.25rem" }}>
                  <div
                    className="yb-timer-bar-fill"
                    style={{
                      width: `${(timerRemaining / (timerTotal || 1)) * 100}%`,
                      backgroundColor: "var(--yb-purple)",
                    }}
                  />
                </div>

                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.25rem", lineHeight: 1.35 }}>
                  {currentQuestion.text}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {currentQuestion.options?.map((opt: any) => (
                    <div
                      key={opt.id}
                      style={{
                        padding: "1rem",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: "#94a3b8",
                      }}
                    >
                      <strong style={{ color: "#fff", fontSize: "1.1rem" }}>{opt.id}.</strong> {opt.text}
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#94a3b8" }}>
                  ¡Analiza bien las alternativas! Los botones se desbloquearán en <strong>{timerRemaining}s</strong>.
                </div>
              </div>
            )}

            {/* QUESTION ANSWERING WITH ENERGETIC COUNTDOWN & TACTILE BUTTONS */}
            {session?.status === "QUESTION_ANSWERING" && currentQuestion && !spectatingTiebreak && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem" }}>
                
                {/* Header with Live Mobile Timer */}
                <div className="yb-hud-panel" style={{ padding: "1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: inTiebreak ? "var(--yb-gold)" : "var(--yb-cyan)", fontWeight: 900, textTransform: "uppercase" }}>
                      {inTiebreak ? "¡DESEMPATE!" : "¡VOTACIÓN ABIERTA!"}
                    </span>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>
                      {inTiebreak ? `Pregunta adicional #${session.tiebreak_round}` : `Ronda ${session.current_round}`}
                    </div>
                  </div>

                  {/* Big Glowing Countdown */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: timerRemaining <= 5 ? "rgba(255, 51, 102, 0.25)" : "rgba(0, 111, 245, 0.25)",
                      border: `1.5px solid ${timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)"}`,
                      padding: "6px 16px",
                      borderRadius: "999px",
                      fontSize: "1.3rem",
                      fontWeight: 900,
                      color: timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)",
                      boxShadow: `0 0 15px ${timerRemaining <= 5 ? "var(--yb-red)" : "var(--yb-cyan)"}44`,
                    }}
                  >
                    <Clock size={18} />
                    {timerRemaining}s
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
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, lineHeight: 1.35 }}>
                    {currentQuestion.text}
                  </h3>
                </div>

                {data.hasAnsweredCurrentQuestion ? (
                  <div className="yb-hud-panel" style={{ padding: "2.25rem 1.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>⚡</div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--yb-cyan)" }}>
                      ¡Respuesta {selectedOption || participantAnswer?.selected_option_id} Enviada!
                    </h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                      Tu voto está bloqueado. En <strong>{timerRemaining}s</strong> se revelará si acertaste en verde o rojo.
                    </p>
                  </div>
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
                        <span style={{ flex: 1, textAlign: "left" }}>{opt.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUESTION REVEAL (SHOWS EXACT GREEN / RED CARDS ON PHONE) */}
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
                      ? "rgba(0, 245, 155, 0.12)"
                      : "rgba(255, 51, 102, 0.12)",
                    boxShadow: `0 0 30px ${participantAnswer?.is_correct ? "var(--yb-green)" : "var(--yb-red)"}33`,
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
                  <p style={{ color: "#fff", fontSize: "0.95rem", marginTop: "0.4rem", fontWeight: 700 }}>
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
                          opacity: !isCorrect && !isMyPick ? 0.4 : 1,
                        }}
                      >
                        <span
                          className={`yb-option-letter yb-letter-${opt.id}`}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            fontSize: "1.1rem",
                            backgroundColor: isCorrect ? "var(--yb-green)" : isMyPick ? "var(--yb-red)" : undefined,
                            color: isCorrect ? "#000" : undefined,
                          }}
                        >
                          {opt.id}
                        </span>
                        
                        <div style={{ flex: 1 }}>
                          <div>{opt.text}</div>
                          {isCorrect && (
                            <div style={{ fontSize: "0.75rem", color: "var(--yb-green)", fontWeight: 800 }}>
                              ✓ RESPUESTA CORRECTA
                            </div>
                          )}
                          {isMyPick && !isCorrect && (
                            <div style={{ fontSize: "0.75rem", color: "var(--yb-red)", fontWeight: 800 }}>
                              ✗ TU ELECCIÓN
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Score Counter */}
                <div
                  className="yb-hud-panel"
                  style={{
                    padding: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Puntaje Acumulado:</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--yb-cyan)" }}>
                    {participant.score} puntos
                  </span>
                </div>
              </div>
            )}

            {/* ROUND RANKING OR FINAL PODIUM */}
            {(session?.status === "ROUND_RANKING" || session?.status === "PODIUM") && (
              <div className="yb-hud-panel" style={{ padding: "2.5rem 1.5rem", textAlign: "center", margin: "auto 0" }}>
                <span className="yb-badge-live" style={{ marginBottom: "0.5rem" }}>
                  {session.status === "PODIUM"
                    ? "FINAL DEL JUEGO"
                    : inTiebreak
                    ? `TRAS EL DESEMPATE #${session.tiebreak_round}`
                    : `FIN RONDA ${session.current_round}`}
                </span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: "0.5rem" }}>
                  Tu Desempeño
                </h2>

                <div
                  style={{
                    margin: "1.5rem 0",
                    padding: "1.5rem",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "20px",
                    border: "1.5px solid var(--yb-border)",
                  }}
                >
                  <div style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Puesto en la Tabla General</div>
                  <div style={{ fontSize: "3rem", fontWeight: 900, color: "var(--yb-gold)", lineHeight: 1.1, marginTop: "6px" }}>
                    #{participant.rank ?? "-"}
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--yb-cyan)", marginTop: "6px" }}>
                    {participant.score} puntos acumulados
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#cbd5e1", marginTop: "8px" }}>
                    {participant.correct_count} de {session.current_round} preguntas acertadas
                  </div>
                </div>

                <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
                  {participant.tied && session.current_round >= session.total_rounds && participant.rank <= prizePlaces
                    ? "⚖️ Estás en un empate técnico por un puesto premiado. Atento al celular: puede haber una pregunta de desempate."
                    : session.status === "PODIUM" && participant.rank && participant.rank <= prizePlaces
                    ? "🎉 ¡Estás en el Podio de Premios Yámboly! Acércate a la mesa de premiación."
                    : session.status !== "PODIUM" && participant.rank && participant.rank <= prizePlaces
                    ? "🔥 ¡Vas en zona de premios! Sigue así."
                    : "Mira la pantalla gigante para ver la clasificación final completa."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
