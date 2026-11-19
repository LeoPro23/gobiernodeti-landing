import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

describe("Yámboly Game Logic & Rules", () => {
  it("calculates 4 points for correct answers and 0 for incorrect", () => {
    const checkAnswer = (selected: string, correct: string) => {
      const isCorrect = selected.trim().toUpperCase() === correct.trim().toUpperCase();
      return {
        isCorrect,
        pointsAwarded: isCorrect ? 4 : 0,
      };
    };

    expect(checkAnswer("A", "A")).toEqual({ isCorrect: true, pointsAwarded: 4 });
    expect(checkAnswer("B", "A")).toEqual({ isCorrect: false, pointsAwarded: 0 });
    expect(checkAnswer("a", "A")).toEqual({ isCorrect: true, pointsAwarded: 4 });
  });

  it("evaluates maximum score across 5 rounds as 20 points", () => {
    const totalRounds = 5;
    const pointsPerCorrect = 4;
    expect(totalRounds * pointsPerCorrect).toBe(20);
  });

  it("handles tiebreaker ranking: higher score first, then lowest response time", () => {
    const participants = [
      { id: 1, full_name: "Ana", score: 16, total_response_time_ms: 12400 },
      { id: 2, full_name: "Carlos", score: 20, total_response_time_ms: 18500 },
      { id: 3, full_name: "Beatriz", score: 20, total_response_time_ms: 15200 }, // beat Carlos by speed!
      { id: 4, full_name: "Daniel", score: 12, total_response_time_ms: 9000 },
    ];

    const sorted = [...participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.total_response_time_ms - b.total_response_time_ms;
    });

    expect(sorted[0].full_name).toBe("Beatriz"); // 20 pts, 15.2s
    expect(sorted[1].full_name).toBe("Carlos");  // 20 pts, 18.5s
    expect(sorted[2].full_name).toBe("Ana");     // 16 pts
    expect(sorted[3].full_name).toBe("Daniel");  // 12 pts
  });
});
