import { describe, it, expect } from "bun:test";
import {
	calcMonthChanges,
	calcMovingAverage,
	calcTrend,
	findAnomalies,
	detectRecurringItems,
	buildPatternData,
	type MonthlyTotal,
} from "./patterns";
import type { Item, Expense } from "../types";

const monthly = (...totals: number[]): MonthlyTotal[] =>
	totals.map((total) => ({ total, myShare: total }));

describe("calcMonthChanges", () => {
	it("computes deltas between consecutive months", () => {
		const changes = calcMonthChanges(monthly(100, 150, 120), 2026);
		expect(changes).toHaveLength(3);
		expect(changes[0]).toMatchObject({
			month: "2026-01",
			previous: 0,
			current: 100,
			delta: 100,
			percentChange: null,
		});
		expect(changes[1]).toMatchObject({
			month: "2026-02",
			previous: 100,
			current: 150,
			delta: 50,
			percentChange: 50,
		});
		expect(changes[2]).toMatchObject({
			month: "2026-03",
			previous: 150,
			current: 120,
			delta: -30,
			percentChange: -20,
		});
	});

	it("returns null percentChange for first month with no previous", () => {
		const changes = calcMonthChanges(monthly(0, 0, 200), 2026);
		expect(changes[0].percentChange).toBeNull();
		expect(changes[2].percentChange).toBeNull();
	});
});

describe("calcMovingAverage", () => {
	it("computes moving average with given window", () => {
		const result = calcMovingAverage([10, 20, 30, 40, 50], 3);
		expect(result[0]).toBeNull();
		expect(result[1]).toBeNull();
		expect(result[2]).toBe(20);
		expect(result[3]).toBe(30);
		expect(result[4]).toBe(40);
	});

	it("returns all nulls for empty array", () => {
		expect(calcMovingAverage([], 3)).toEqual([]);
	});

	it("handles window larger than array length", () => {
		const result = calcMovingAverage([10, 20], 5);
		expect(result[0]).toBeNull();
		expect(result[1]).toBeNull();
	});
});

describe("calcTrend", () => {
	it("detects upward trend", () => {
		const trend = calcTrend([100, 120, 140, 160, 180]);
		expect(trend.direction).toBe("up");
		expect(trend.slope).toBeGreaterThan(0);
	});

	it("detects downward trend", () => {
		const trend = calcTrend([200, 180, 160, 140, 120]);
		expect(trend.direction).toBe("down");
		expect(trend.slope).toBeLessThan(0);
	});

	it("detects stable trend", () => {
		const trend = calcTrend([100, 100, 100, 100, 100]);
		expect(trend.direction).toBe("stable");
		expect(trend.slope).toBe(0);
	});

	it("returns stable for empty array", () => {
		const trend = calcTrend([]);
		expect(trend.direction).toBe("stable");
		expect(trend.slope).toBe(0);
		expect(trend.monthlyValues).toEqual([]);
	});

	it("returns stable for single value", () => {
		const trend = calcTrend([100]);
		expect(trend.direction).toBe("stable");
	});

	it("ignores zero values for slope calculation", () => {
		const trend = calcTrend([0, 0, 100, 120, 140]);
		expect(trend.direction).toBe("up");
	});
});

describe("findAnomalies", () => {
	it("detects high outliers", () => {
		const anomalies = findAnomalies([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 500]);
		expect(anomalies).toHaveLength(1);
		expect(anomalies[0].month).toBe("Dic");
		expect(anomalies[0].zScore).toBeGreaterThan(2);
	});

	it("detects low outliers", () => {
		const anomalies = findAnomalies([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 5]);
		expect(anomalies).toHaveLength(1);
		expect(anomalies[0].month).toBe("Dic");
		expect(anomalies[0].zScore).toBeLessThan(-2);
	});

	it("returns empty for insufficient data", () => {
		expect(findAnomalies([100, 200])).toEqual([]);
		expect(findAnomalies([])).toEqual([]);
	});

	it("returns empty when no outliers", () => {
		expect(findAnomalies([100, 100, 100, 100, 100])).toEqual([]);
	});

	it("respects custom threshold", () => {
		const anomalies = findAnomalies([100, 100, 100, 200, 100], 1);
		expect(anomalies.length).toBeGreaterThan(0);
	});
});

describe("detectRecurringItems", () => {
	const items: Item[] = [
		{ id: "alquiler", name: "Alquiler", type: "home" },
		{ id: "compra", name: "Compra", type: "credit_card" },
	];

	const makeExpenses = (itemId: string, amounts: number[]): Expense[] =>
		amounts.map((amount, i) => ({
			id: `e${i}`,
			itemId,
			description: `Gasto ${i}`,
			amount,
			date: `2026-${String(i + 1).padStart(2, "0")}-01`,
			ownership: { percentage: 100 },
		}));

	it("detects stable recurring items", () => {
		const expenses = [
			...makeExpenses("alquiler", [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]),
			...makeExpenses("compra", [500]),
		];
		const result = detectRecurringItems(items, expenses, 2026);
		expect(result).toHaveLength(1);
		expect(result[0].itemId).toBe("alquiler");
		expect(result[0].monthsActive).toBe(12);
		expect(result[0].stability).toBeGreaterThan(0.7);
	});

	it("excludes items with fewer than 3 months", () => {
		const expenses = makeExpenses("compra", [500, 600]);
		const result = detectRecurringItems(items, expenses, 2026);
		expect(result).toHaveLength(0);
	});

	it("excludes items with low stability", () => {
		const expenses = makeExpenses("alquiler", [100, 500, 50, 800, 200, 900, 100, 600, 50, 700, 200, 800]);
		const result = detectRecurringItems(items, expenses, 2026);
		expect(result).toHaveLength(0);
	});
});

describe("buildPatternData", () => {
	const items: Item[] = [
		{ id: "alquiler", name: "Alquiler", type: "home" },
		{ id: "compra", name: "Compra", type: "credit_card" },
	];

	it("builds pattern data for all items", () => {
		const expenses: Expense[] = [
			{ id: "e1", itemId: "alquiler", description: "Alquiler Ene", amount: 100, date: "2026-01-01", ownership: { percentage: 100 } },
			{ id: "e2", itemId: "alquiler", description: "Alquiler Feb", amount: 120, date: "2026-02-01", ownership: { percentage: 100 } },
			{ id: "e3", itemId: "alquiler", description: "Alquiler Mar", amount: 140, date: "2026-03-01", ownership: { percentage: 100 } },
			{ id: "e4", itemId: "compra", description: "Notebook", amount: 500, date: "2026-02-15", ownership: { percentage: 100 } },
		];
		const result = buildPatternData(items, expenses, 2026);
		expect(result).toHaveLength(2);

		const alquiler = result.find((p) => p.itemId === "alquiler")!;
		expect(alquiler.itemName).toBe("Alquiler");
		expect(alquiler.monthChanges).toHaveLength(12);
		expect(alquiler.trend.direction).toBe("up");
	});

	it("filters to a single item when itemId is provided", () => {
		const expenses: Expense[] = [
			{ id: "e1", itemId: "alquiler", description: "Alquiler", amount: 100, date: "2026-01-01", ownership: { percentage: 100 } },
			{ id: "e4", itemId: "compra", description: "Notebook", amount: 500, date: "2026-02-15", ownership: { percentage: 100 } },
		];
		const result = buildPatternData(items, expenses, 2026, "alquiler");
		expect(result).toHaveLength(1);
		expect(result[0].itemId).toBe("alquiler");
	});
});
