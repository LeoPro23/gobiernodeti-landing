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

// Web Audio API synthesized sound effects (Zero external files needed)
function playTickSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Audio might be blocked until user interacts
  }
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

    const defaultColors = ["#006ff5", "#ae1df5", "#00d2ff", "#ff007a", "#ffb703", "#00f59b"];

    categories.forEach((cat, i) => {
      const sliceAngle = i * arc;
      const baseColor = cat.color || defaultColors[i % defaultColors.length];

      // Draw slice background
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 14, sliceAngle, sliceAngle + arc);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
      grad.addColorStop(0, baseColor);
      grad.addColorStop(0.85, "#04142b");
      grad.addColorStop(1, "#020914");
      ctx.fillStyle = grad;
      ctx.fill();

      // Neon segment separation
      ctx.strokeStyle = "rgba(66, 220, 255, 0.4)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Slice outer rim lights (bulbs)
      const midAngle = sliceAngle + arc / 2;
      const bulbX = (radius - 22) * Math.cos(midAngle);
      const bulbY = (radius - 22) * Math.sin(midAngle);
      ctx.beginPath();
      ctx.arc(bulbX, bulbY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = isSpinning ? "#ffffff" : "var(--yb-cyan)";
      ctx.shadowColor = "#42dcff";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Text label inside slice
      ctx.save();
      ctx.rotate(midAngle);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
      ctx.shadowBlur = 10;

      const label = cat.name.length > 22 ? cat.name.slice(0, 20) + "..." : cat.name;
      ctx.fillText(label, radius - 40, 6);
      ctx.restore();
    });

    // Outer neon rim
    ctx.beginPath();
    ctx.arc(0, 0, radius - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(66, 220, 255, 0.8)";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#42dcff";
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

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

    const duration = 5200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Deceleration easing
      const ease = 1 - Math.pow(1 - progress, 3.8);
      const angle = startAngle + totalRotation * ease;
      currentAngleRef.current = angle;

      // Tick audio trigger when pointer passes into a new sector
      const pointerNormalized = (1.5 * Math.PI - (angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSlice = Math.floor(pointerNormalized / arc);
      if (currentSlice !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSlice;
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
        {/* Pointer with animated neon drop glow */}
        <div className="yb-wheel-pointer" />
        <canvas
          ref={canvasRef}
          width={size * 2}
          height={size * 2}
          className="yb-wheel-canvas"
          style={{ width: size, height: size }}
        />
        <div className="yb-wheel-center" style={{ overflow: "hidden", padding: "8px", background: "#ffffff" }}>
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
            padding: "1rem 2rem",
            background: "rgba(6, 25, 52, 0.9)",
            border: `2px solid ${selectedCategory.color || "var(--yb-cyan)"}`,
            borderRadius: "20px",
            textAlign: "center",
            boxShadow: `0 0 35px ${selectedCategory.color || "var(--yb-cyan)"}66`,
            animation: "pulse-dot 2.5s infinite",
            maxWidth: "600px",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px" }}>
            🎯 Categoría Sorteada
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ffffff", marginTop: "4px" }}>
            {selectedCategory.name}
          </div>
        </div>
      )}
    </div>
  );
}
