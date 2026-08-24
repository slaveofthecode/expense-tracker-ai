import { describe, it, expect } from "bun:test";
import type { Item, Expense } from "../types";
import { calcYearlySummaries } from "./summaries";
import {
  computeCharts,
  totalsByType,
  topItems,
  scaleBlocks,
  scaleBlocksMin,
  barString,
  distributeSegments,
  percent,
  annotation,
} from "./charts";

const items: Item[] = [
  { id: "alquiler", name: "Alquiler", type: "home" },
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
  { id: "auto-seguro", name: "Seguro Auto", type: "car" },
  { id: "cafe", name: "Café", type: "other" },
];

const expenses: Expense[] = [
  {
    id: "1",
    itemId: "alquiler",
    description: "Alquiler julio 2026",
    amount: 180000,
    date: "2026-07-01",
    ownership: { percentage: 100 },
  },
  {
    id: "2",
    itemId: "naranja",
    description: "Supermercado",
    amount: 60000,
    date: "2026-06-05",
    ownership: { percentage: 50, person: "Lourdes" },
  },
  {
    id: "3",
    itemId: "auto-seguro",
    description: "Póliza semestral",
    amount: 30000,
    date: "2026-03-01",
    ownership: { percentage: 100 },
  },
];

describe("computeCharts", () => {
  it("aggregates monthly totals and myShare across items", () => {
    const data = computeCharts(items, expenses, 2026);
    expect(data.monthly).toHaveLength(12);
    expect(data.monthly[2]).toEqual({ total: 30000, myShare: 30000 });
    expect(data.monthly[5]).toEqual({ total: 60000, myShare: 30000 });
    expect(data.monthly[6]).toEqual({ total: 180000, myShare: 180000 });
    expect(data.monthly[0]).toEqual({ total: 0, myShare: 0 });
  });

  it("prorates installments across the year", () => {
    const installment: Expense = {
      id: "4",
      itemId: "naranja",
      description: "Notebook 12 cuotas",
      amount: 120000,
      date: "2026-01-10",
      installments: { total: 12, current: 1 },
      ownership: { percentage: 100 },
    };
    const data = computeCharts(items, [...expenses, installment], 2026);
    expect(data.monthly[0].total).toBe(10000);
    expect(data.monthly[11].total).toBe(10000);
    expect(data.monthly.reduce((acc, m) => acc + m.total, 0)).toBe(180000 + 60000 + 30000 + 120000);
  });

  it("returns zeros for a year without expenses", () => {
    const data = computeCharts(items, expenses, 2025);
    expect(data.monthly.every((m) => m.total === 0)).toBe(true);
    expect(data.byType).toHaveLength(0);
    expect(data.top).toHaveLength(0);
  });
});

describe("totalsByType", () => {
  it("sums per type, keeps order desc and skips empty types", () => {
    const summaries = calcYearlySummaries(items, expenses, 2026);
    const result = totalsByType(items, summaries);
    expect(result.map((r) => r.type)).toEqual(["home", "credit_card", "car"]);
    expect(result.map((r) => r.value)).toEqual([180000, 60000, 30000]);
  });

  it("computes percentage of the yearly total", () => {
    const summaries = calcYearlySummaries(items, expenses, 2026);
    const result = totalsByType(items, summaries);
    expect(result[0].percentage).toBeCloseTo(2 / 3, 5);
    expect(result[1].percentage).toBeCloseTo(2 / 9, 5);
    expect(result[2].percentage).toBeCloseTo(1 / 9, 5);
  });
});

describe("topItems", () => {
  it("returns top items sorted desc and limited", () => {
    const summaries = calcYearlySummaries(items, expenses, 2026);
    const result = topItems(items, summaries, 2);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.label)).toEqual(["Alquiler", "Tarjeta Naranja"]);
    expect(result.map((r) => r.value)).toEqual([180000, 60000]);
  });

  it("skips items without expenses", () => {
    const summaries = calcYearlySummaries(items, expenses, 2026);
    const result = topItems(items, summaries, 10);
    expect(result.some((r) => r.label === "Café")).toBe(false);
  });
});

describe("scaleBlocks", () => {
  it("scales value to a block count", () => {
    expect(scaleBlocks(60, 100, 10)).toBe(6);
    expect(scaleBlocks(100, 100, 10)).toBe(10);
    expect(scaleBlocks(0, 100, 10)).toBe(0);
  });

  it("handles degenerate inputs", () => {
    expect(scaleBlocks(50, 0, 10)).toBe(0);
    expect(scaleBlocks(50, 100, 0)).toBe(0);
  });
});

describe("scaleBlocksMin", () => {
  it("ensures at least one block for non-zero values", () => {
    expect(scaleBlocksMin(1, 100, 20)).toBe(1);
    expect(scaleBlocksMin(60, 100, 10)).toBe(6);
    expect(scaleBlocksMin(100, 100, 10)).toBe(10);
  });

  it("keeps zero values at zero and guards degenerate inputs", () => {
    expect(scaleBlocksMin(0, 100, 10)).toBe(0);
    expect(scaleBlocksMin(5, 0, 10)).toBe(0);
    expect(scaleBlocksMin(5, 100, 0)).toBe(0);
  });
});

describe("barString", () => {
  it("builds filled + empty segments", () => {
    expect(barString(3, 5)).toBe("███░░");
    expect(barString(5, 5)).toBe("█████");
    expect(barString(0, 3)).toBe("░░░");
  });

  it("clamps blocks to width", () => {
    expect(barString(10, 5)).toBe("█████");
    expect(barString(-2, 5)).toBe("░░░░░");
  });
});

describe("distributeSegments", () => {
  it("assigns blocks proportionally", () => {
    expect(distributeSegments([60, 30, 10], 10)).toEqual([6, 3, 1]);
  });

  it("uses largest remainder for uneven widths", () => {
    const result = distributeSegments([50, 50], 7);
    expect(result.reduce((a, b) => a + b, 0)).toBe(7);
    expect(Math.max(...result)).toBe(4);
  });

  it("gives non-zero segments at least one block", () => {
    const result = distributeSegments([99, 1], 50);
    expect(result.reduce((a, b) => a + b, 0)).toBe(50);
    expect(result).toEqual([49, 1]);
  });

  it("handles empty and zero-width inputs", () => {
    expect(distributeSegments([], 10)).toEqual([]);
    expect(distributeSegments([5, 5], 0)).toEqual([0, 0]);
    expect(distributeSegments([0, 0], 10)).toEqual([0, 0]);
  });
});

describe("percent", () => {
  it("computes ratio and guards division by zero", () => {
    expect(percent(30, 300)).toBe(0.1);
    expect(percent(30, 0)).toBe(0);
  });
});

describe("annotation", () => {
  it("formats amount and percentage", () => {
    expect(annotation(150000, 0.5)).toBe("$150.000  50%");
    expect(annotation(12345, 0.33333)).toBe("$12.345  33%");
  });
});
