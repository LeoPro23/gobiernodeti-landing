"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Sliders, MonitorPlay, Sparkles } from "lucide-react";

export function YambolyLauncher() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "7px 15px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #e6007e 0%, #00a3e0 100%)",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: "0.85rem",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(230, 0, 126, 0.35)",
          transition: "transform 0.15s ease",
        }}
      >
        <span>🎡 Yámboly Quiz</span>
        <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "300px",
            background: "#ffffff",
            border: "1.5px solid rgba(230, 0, 126, 0.2)",
            borderRadius: "18px",
            boxShadow: "0 15px 40px rgba(0, 40, 100, 0.15), 0 4px 12px rgba(230, 0, 126, 0.08)",
            padding: "10px",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ padding: "4px 8px 2px", fontSize: "0.75rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>
            Elegir destino:
          </div>

          {/* Option 1: Moderator */}
          <Link
            href="/yamboly/moderador"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              color: "#0f172a",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(0, 163, 224, 0.15)", color: "#00a3e0" }}>
              <Sliders size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>Panel del Moderador</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                Controla las rondas, ruleta y avance de preguntas.
              </div>
            </div>
          </Link>

          {/* Option 2: Projector Screen */}
          <Link
            href="/yamboly/screen"
            target="_blank"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "12px",
              background: "#fff0f6",
              border: "1px solid rgba(230, 0, 126, 0.2)",
              color: "#0f172a",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(230, 0, 126, 0.15)", color: "#e6007e" }}>
              <MonitorPlay size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>Pantalla del Auditorio ↗</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                Abre la vista gigante para enviar al proyector.
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
