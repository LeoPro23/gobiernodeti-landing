"use client";

import React, { useEffect, useRef } from "react";

interface ConfettiCanvasProps {
  active?: boolean;
  duration?: number; // ms, or 0 for continuous
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  shape: "rect" | "circle" | "ribbon";
  opacity: number;
  scaleX: number;
}

const YAMBOLY_CONFETTI_COLORS = [
  "#E6007E", // Magenta Yámboly
  "#00A3E0", // Cyan Helado
  "#FFC709", // Amarillo Sol
  "#FF1493", // Rosa Chicle
  "#9333EA", // Púrpura Fiesta
  "#10B981", // Menta Refrescante
  "#FFB703", // Dorado Campeón
  "#FFFFFF", // Nieve / Crema
];

export function ConfettiCanvas({ active = true, duration = 0 }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isRunning = true;
    const startTime = Date.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate initial burst of particles
    const particles: Particle[] = [];
    const count = Math.min(180, Math.floor(window.innerWidth / 8));

    for (let i = 0; i < count; i++) {
      const fromLeft = Math.random() < 0.5;
      particles.push({
        x: fromLeft ? Math.random() * (canvas.width * 0.3) : canvas.width * 0.7 + Math.random() * (canvas.width * 0.3),
        y: canvas.height * 0.2 + Math.random() * (canvas.height * 0.4),
        size: 7 + Math.random() * 8,
        color: YAMBOLY_CONFETTI_COLORS[Math.floor(Math.random() * YAMBOLY_CONFETTI_COLORS.length)],
        vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 6),
        vy: -4 - Math.random() * 6,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.15,
        shape: Math.random() < 0.6 ? "rect" : Math.random() < 0.85 ? "ribbon" : "circle",
        opacity: 1,
        scaleX: 1,
      });
    }

    const render = () => {
      if (!isRunning) return;

      const elapsed = Date.now() - startTime;
      if (duration > 0 && elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Periodically spawn new particles from the top
      if (particles.length < count && (duration === 0 || elapsed < duration - 2000)) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -15,
          size: 6 + Math.random() * 8,
          color: YAMBOLY_CONFETTI_COLORS[Math.floor(Math.random() * YAMBOLY_CONFETTI_COLORS.length)],
          vx: (Math.random() - 0.5) * 4,
          vy: 2 + Math.random() * 4,
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.1,
          shape: Math.random() < 0.6 ? "rect" : "ribbon",
          opacity: 1,
          scaleX: 1,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Gravity
        p.vx *= 0.99; // Air friction
        p.angle += p.vAngle;
        p.scaleX = Math.cos(p.angle);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(p.scaleX, 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        } else if (p.shape === "ribbon") {
          ctx.fillRect(-p.size / 2, -p.size * 0.8, p.size * 0.45, p.size * 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Recycle or remove fallen particles
        if (p.y > canvas.height + 20) {
          if (duration === 0 || elapsed < duration - 2000) {
            p.y = -15;
            p.x = Math.random() * canvas.width;
            p.vy = 2 + Math.random() * 3;
            p.vx = (Math.random() - 0.5) * 3;
          } else {
            particles.splice(i, 1);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
