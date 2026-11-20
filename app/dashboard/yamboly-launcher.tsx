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
          borderRadius: "10px",
          background: "linear-gradient(135deg, #ff007a 0%, #ae1df5 100%)",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: "0.85rem",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 0 16px rgba(255, 0, 122, 0.4)",
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
            width: "290px",
            background: "#06152b",
            border: "1.5px solid rgba(66, 220, 255, 0.3)",
            borderRadius: "16px",
            boxShadow: "0 15px 40px rgba(0,0,0,0.8)",
            padding: "8px",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ padding: "6px 10px 4px", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
            Elegir destino:
          </div>

          {/* Option 1: Moderator */}
          <Link
            href="/yamboly/moderador"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(0, 111, 245, 0.3)", color: "var(--yb-cyan)" }}>
              <Sliders size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Panel del Moderador</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
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
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(255, 0, 122, 0.3)", color: "#ff4da6" }}>
              <MonitorPlay size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Pantalla del Auditorio ↗</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                Abre la vista gigante para enviar al proyector.
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
