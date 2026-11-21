"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Search, Users } from "lucide-react";

type QuizParticipant = {
  id: number;
  full_name: string;
  dni: string | null;
  email: string | null;
  created_at: string;
  score: number;
  from_fullday: boolean;
};

const time = new Intl.DateTimeFormat("es-PE", { timeStyle: "short", timeZone: "America/Lima" });

const cell: React.CSSProperties = { padding: "0.6rem 0.75rem", borderBottom: "1px solid rgba(148, 163, 184, 0.2)", fontSize: "0.85rem", verticalAlign: "middle", color: "var(--yb-text-body)" };
const head: React.CSSProperties = { ...cell, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--yb-text-muted)", fontWeight: 800, textAlign: "left", position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 };
const input: React.CSSProperties = { width: "100%", padding: "0.55rem 0.75rem", borderRadius: "10px", background: "#fff", border: "1px solid rgba(148, 163, 184, 0.45)", color: "var(--yb-text-title)", fontSize: "0.9rem", outline: "none" };
const smallButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0, padding: "0.45rem 0.8rem", borderRadius: "8px", border: "1px solid var(--yb-border)", background: "#fff", color: "var(--yb-primary)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" };

// Lista de inscritos al quiz para moderar nombres durante el evento.
// El nombre corregido se ve en el proyector y en el celular en el siguiente sondeo (~1 s).
export function ParticipantsPanel() {
  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState<QuizParticipant[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/yamboly/participants?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cargar la lista.");
      setParticipants(json.participants);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo cargar la lista.");
    }
  }, []);

  // Busca al escribir y refresca cada 5 s para ver a quienes se van registrando.
  useEffect(() => {
    const debounce = setTimeout(() => load(query), 250);
    const interval = setInterval(() => load(query), 5000);
    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [query, load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/yamboly/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, name: editing.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar el nombre.");
      setFeedback({ ok: true, text: json.changed ? "Nombre actualizado. Ya se ve en el proyector y en su celular." : "El nombre no cambió." });
      setEditing(null);
      await load(query);
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : "No se pudo guardar el nombre." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="yb-hud-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }} aria-labelledby="yb-inscritos-title">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <h2 id="yb-inscritos-title" style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--yb-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={18} aria-hidden="true" /> Inscritos al quiz
            {participants && <span style={{ fontSize: "0.8rem", padding: "2px 10px", borderRadius: "999px", background: "rgba(0, 163, 224, 0.12)", color: "var(--yb-cyan)" }}>{participants.length}{query ? " encontrados" : ""}</span>}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--yb-text-muted)", marginTop: "4px" }}>Corrige nombres fuera de lugar. El cambio queda en el historial del quiz.</p>
        </div>
        <label style={{ position: "relative", flex: "0 1 320px", minWidth: "220px" }}>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Buscar inscrito</span>
          <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--yb-text-muted)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={120} placeholder="Nombre, DNI o correo" style={{ ...input, paddingLeft: "2.2rem" }} />
        </label>
      </div>

      {feedback && (
        <p role={feedback.ok ? "status" : "alert"} style={{ fontSize: "0.85rem", marginBottom: "0.75rem", padding: "0.6rem 0.8rem", borderRadius: "10px", background: feedback.ok ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: feedback.ok ? "#047857" : "#b91c1c" }}>
          {feedback.text}
        </p>
      )}
      {loadError && <p role="alert" style={{ fontSize: "0.85rem", color: "#b91c1c", marginBottom: "0.75rem" }}>{loadError}</p>}

      <div style={{ maxHeight: "420px", overflow: "auto", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.25)", background: "#fff" }} role="region" aria-label="Inscritos al quiz" tabIndex={0}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
          <thead>
            <tr>
              <th scope="col" style={head}>Nombre</th>
              <th scope="col" style={head}>DNI</th>
              <th scope="col" style={head}>Correo</th>
              <th scope="col" style={head}>Origen</th>
              <th scope="col" style={head}>Registro</th>
              <th scope="col" style={{ ...head, textAlign: "right" }}>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {participants?.length ? participants.map((p) => (
              <tr key={p.id}>
                <td style={{ ...cell, minWidth: "280px" }}>
                  {editing?.id === p.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", gap: "6px" }}>
                      <input autoFocus value={editing.name} maxLength={200} required aria-label={`Nuevo nombre para ${p.full_name}`} onChange={(e) => setEditing({ id: p.id, name: e.target.value })} style={input} disabled={saving} />
                      <button type="submit" disabled={saving} style={{ ...smallButton, background: "var(--yb-primary)", borderColor: "var(--yb-primary)", color: "#fff" }}>{saving ? "…" : "Guardar"}</button>
                      <button type="button" disabled={saving} onClick={() => setEditing(null)} style={smallButton}>Cancelar</button>
                    </form>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <strong style={{ fontWeight: 700, wordBreak: "break-word", color: "var(--yb-text-title)" }}>{p.full_name}</strong>
                      <button type="button" onClick={() => { setFeedback(null); setEditing({ id: p.id, name: p.full_name }); }} style={smallButton} aria-label={`Editar el nombre de ${p.full_name}`}>
                        <Pencil size={13} aria-hidden="true" /> Editar
                      </button>
                    </div>
                  )}
                </td>
                <td style={{ ...cell, fontFamily: "monospace" }}>{p.dni ?? "—"}</td>
                <td style={{ ...cell, color: "var(--yb-text-muted)" }}>{p.email ?? "—"}</td>
                <td style={cell}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", background: p.from_fullday ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.15)", color: p.from_fullday ? "#047857" : "var(--yb-text-muted)", whiteSpace: "nowrap" }}>
                    {p.from_fullday ? "Inscrito Fullday" : "Sin inscripción Fullday"}
                  </span>
                </td>
                <td style={{ ...cell, whiteSpace: "nowrap", color: "var(--yb-text-muted)" }}>{time.format(new Date(p.created_at))}</td>
                <td style={{ ...cell, textAlign: "right", fontWeight: 800, color: "var(--yb-text-title)" }}>{p.score}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ ...cell, textAlign: "center", color: "var(--yb-text-muted)", padding: "2rem 1rem" }}>
                  {participants === null ? "Cargando inscritos…" : query ? "Sin coincidencias para esa búsqueda." : "Todavía no hay inscritos."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
