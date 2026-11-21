"use client";

import React, { useEffect, useRef, useState } from "react";

interface Category {
  id: number;
  name: string;
  color: string;
  used?: boolean;
}

interface RouletteWheelProps {
  categories: Category[];
  targetCategoryId?: number | null;
  isSpinning: boolean;
  onSpinEnd?: () => void;
  size?: number;
}

// Web Audio API synthesized sound effects
function playTickSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

function playWinSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [440, 554.37, 659.25, 880]; // A major chord fanfare
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.45);
    });
  } catch (e) {}
}

const YAMBOLY_WHEEL_COLORS = [
  "#e6007e", // Magenta Yámboly
  "#00a3e0", // Cyan Helado
  "#ffb703", // Mango Dorado
  "#8b5cf6", // Mora Silvestre
  "#10b981", // Menta Refrescante
  "#f97316", // Naranja Cítrica
];

export function RouletteWheel({
  categories,
  targetCategoryId,
  isSpinning,
  onSpinEnd,
  size = 500,
}: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const lastTickSliceRef = useRef<number>(-1);

  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const count = categories.length || 5;
    const arc = (2 * Math.PI) / count;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angle);

    categories.forEach((cat, i) => {
      const sliceAngle = i * arc;
      const baseColor = cat.color || YAMBOLY_WHEEL_COLORS[i % YAMBOLY_WHEEL_COLORS.length];

      // Draw slice background
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 14, sliceAngle, sliceAngle + arc);
      ctx.closePath();

      // Radiant slice gradient for Light Mode
      const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, baseColor);
      grad.addColorStop(1, baseColor);
      ctx.fillStyle = grad;
      ctx.fill();

      // Slice white separator line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Outer bulb light
      const midAngle = sliceAngle + arc / 2;
      const bulbX = (radius - 24) * Math.cos(midAngle);
      const bulbY = (radius - 24) * Math.sin(midAngle);
      ctx.beginPath();
      ctx.arc(bulbX, bulbY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = isSpinning ? "#ffffff" : "#ffb703";
      ctx.shadowColor = "#ffb703";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Text label inside slice
      ctx.save();
      ctx.rotate(midAngle);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 17px system-ui, -apple-system, sans-serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const label = cat.name.length > 22 ? cat.name.slice(0, 20) + "..." : cat.name;
      ctx.fillText(label, radius - 44, 6);
      ctx.restore();
    });

    // Outer golden & magenta rim
    ctx.beginPath();
    ctx.arc(0, 0, radius - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ffb703";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius - 14, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(230, 0, 126, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [categories]);

  useEffect(() => {
    if (!isSpinning) return;

    const count = categories.length || 5;
    const arc = (2 * Math.PI) / count;

    let targetIndex = 0;
    if (targetCategoryId) {
      const idx = categories.findIndex((c) => c.id === targetCategoryId);
      if (idx !== -1) targetIndex = idx;
    } else {
      targetIndex = Math.floor(Math.random() * count);
    }

    // Pointer is at the top (-PI/2)
    const desiredFinalAngleMod = 1.5 * Math.PI - (targetIndex * arc + arc / 2);
    const fullSpins = 7 * 2 * Math.PI;
    const currentNorm = currentAngleRef.current % (2 * Math.PI);
    const startAngle = currentAngleRef.current;
    const delta = (desiredFinalAngleMod - currentNorm + 2 * Math.PI) % (2 * Math.PI);
    const totalRotation = fullSpins + delta;
    const targetAngle = startAngle + totalRotation;

    const duration = 5200; // 5.2 seconds spin
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quartic ease out
      const ease = 1 - Math.pow(1 - progress, 4);
      const angle = startAngle + totalRotation * ease;
      currentAngleRef.current = angle;

      // Audio tick calculation
      const currentNormAngle = (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const activeSlice = Math.floor(
        ((1.5 * Math.PI - currentNormAngle + 2 * Math.PI) % (2 * Math.PI)) / arc
      );
      if (activeSlice !== lastTickSliceRef.current) {
        lastTickSliceRef.current = activeSlice;
        playTickSound();
      }

      drawWheel(angle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentAngleRef.current = targetAngle;
        drawWheel(targetAngle);
        const winner = categories[targetIndex] || null;
        setSelectedCategory(winner);
        playWinSound();
        if (onSpinEnd) onSpinEnd();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpinning, targetCategoryId, categories]);

  return (
    <div className="yb-roulette-container">
      <div className="yb-wheel-wrap" style={{ width: size, height: size }}>
        {/* Pointer with animated drop glow */}
        <div className="yb-wheel-pointer" />
        <canvas
          ref={canvasRef}
          width={size * 2}
          height={size * 2}
          className="yb-wheel-canvas"
          style={{ width: size, height: size }}
        />
        <div className="yb-wheel-center" style={{ overflow: "hidden", padding: "8px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/sponsor/yamboli.jpg"
            alt="Logo Yámboly"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </div>

      {selectedCategory && (
        <div
          style={{
            marginTop: "1.75rem",
            padding: "1rem 2.25rem",
            background: "rgba(255, 255, 255, 0.96)",
            border: `2px solid ${selectedCategory.color || "var(--yb-primary)"}`,
            borderRadius: "22px",
            textAlign: "center",
            boxShadow: `0 10px 30px rgba(230, 0, 126, 0.15)`,
            animation: "pulse-dot 2.5s infinite",
            maxWidth: "600px",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--yb-primary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>
            🎯 Categoría Sorteada
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "var(--yb-text-title)", marginTop: "4px" }}>
            {selectedCategory.name}
          </div>
        </div>
      )}
    </div>
  );
}
