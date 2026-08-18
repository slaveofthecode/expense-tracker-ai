import type { Item, Expense } from "../types";
import { calcYearlySummaries } from "./summaries";
import type { MonthlyTotal, YearlySummary } from "./summaries";

export type { MonthlyTotal } from "./summaries";

export interface MonthChange {
	month: string;
	previous: number;
	current: number;
	delta: number;
	percentChange: number | null;
}

export interface Trend {
	direction: "up" | "down" | "stable";
	slope: number;
	monthlyValues: number[];
}

export interface Anomaly {
	month: string;
	value: number;
	expected: number;
	zScore: number;
}

export interface RecurringItem {
	itemId: string;
	itemName: string;
	monthsActive: number;
	averageAmount: number;
	stability: number;
}

export interface PatternData {
	itemId: string;
	itemName: string;
	monthlyTotals: MonthlyTotal[];
	monthChanges: MonthChange[];
	trend: Trend;
	anomalies: Anomaly[];
	isRecurring: boolean;
}

const MONTH_LABELS = [
	"Ene", "Feb", "Mar", "Abr", "May", "Jun",
	"Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function calcMonthChanges(
	monthlyTotals: MonthlyTotal[],
	year: number,
): MonthChange[] {
	return monthlyTotals.map((m, i) => {
		const prev = i > 0 ? monthlyTotals[i - 1] : null;
		const previous = prev?.total ?? 0;
		const current = m.total;
		const delta = current - previous;
		const percentChange =
			previous > 0 ? Math.round((delta / previous) * 100) : null;
		return {
			month: `${year}-${String(i + 1).padStart(2, "0")}`,
			previous,
			current,
			delta,
			percentChange,
		};
	});
}

export function calcMovingAverage(
	values: number[],
	window: number,
): (number | null)[] {
	return values.map((_, i) => {
		const start = Math.max(0, i - window + 1);
		const slice = values.slice(start, i + 1);
		if (slice.length < window && i < window - 1) return null;
		return slice.reduce((a, b) => a + b, 0) / slice.length;
	});
}

export function calcTrend(values: number[]): Trend {
	const n = values.length;
	if (n === 0) {
		return { direction: "stable", slope: 0, monthlyValues: [] };
	}

	const filteredIndices: number[] = [];
	const filteredValues: number[] = [];
	for (let i = 0; i < n; i++) {
		if (values[i] > 0) {
			filteredIndices.push(i);
			filteredValues.push(values[i]);
		}
	}

	if (filteredValues.length < 2) {
		return { direction: "stable", slope: 0, monthlyValues: values };
	}

	const sumX = filteredIndices.reduce((a, b) => a + b, 0);
	const sumY = filteredValues.reduce((a, b) => a + b, 0);
	const sumXY = filteredIndices.reduce((a, x, i) => a + x * filteredValues[i], 0);
	const sumX2 = filteredIndices.reduce((a, x) => a + x * x, 0);
	const count = filteredIndices.length;

	const slope = (count * sumXY - sumX * sumY) / (count * sumX2 - sumX * sumX);

	const avgY = sumY / count;
	const avgX = sumX / count;
	const threshold = avgY * 0.05;

	let direction: "up" | "down" | "stable";
	if (Math.abs(slope) < threshold) {
		direction = "stable";
	} else if (slope > 0) {
		direction = "up";
	} else {
		direction = "down";
	}

	return { direction, slope: Math.round(slope), monthlyValues: values };
}

export function findAnomalies(
	values: number[],
	threshold: number = 2,
): Anomaly[] {
	const positiveValues = values.filter((v) => v > 0);
	if (positiveValues.length < 3) return [];

	const mean = positiveValues.reduce((a, b) => a + b, 0) / positiveValues.length;
	const variance =
		positiveValues.reduce((a, v) => a + (v - mean) ** 2, 0) / positiveValues.length;
	const stdDev = Math.sqrt(variance);

	if (stdDev === 0) return [];

	return values
		.map((value, i) => {
			if (value === 0) return null;
			const zScore = (value - mean) / stdDev;
			if (Math.abs(zScore) > threshold) {
				return {
					month: MONTH_LABELS[i],
					value,
					expected: Math.round(mean),
					zScore: Math.round(zScore * 100) / 100,
				};
			}
			return null;
		})
		.filter((a): a is Anomaly => a !== null);
}

export function detectRecurringItems(
	items: Item[],
	expenses: Expense[],
	year: number,
): RecurringItem[] {
	const summaries = calcYearlySummaries(items, expenses, year);

	return summaries
		.map((s) => {
			const item = items.find((i) => i.id === s.itemId);
			const activeMonths = s.months.filter((m) => m.total > 0);
			const monthsActive = activeMonths.length;

			if (monthsActive < 3) return null;

			const amounts = activeMonths.map((m) => m.total);
			const averageAmount =
				amounts.reduce((a, b) => a + b, 0) / amounts.length;
			const variance =
				amounts.reduce((a, v) => a + (v - averageAmount) ** 2, 0) /
				amounts.length;
			const stdDev = Math.sqrt(variance);
			const stability = averageAmount > 0
				? Math.max(0, 1 - stdDev / averageAmount)
				: 0;

			if (stability < 0.7) return null;

			return {
				itemId: s.itemId,
				itemName: item?.name ?? s.itemId,
				monthsActive,
				averageAmount: Math.round(averageAmount),
				stability: Math.round(stability * 100) / 100,
			};
		})
		.filter((r): r is RecurringItem => r !== null);
}

export function buildPatternData(
	items: Item[],
	expenses: Expense[],
	year: number,
	itemId?: string,
): PatternData[] {
	const summaries = calcYearlySummaries(
		itemId ? items.filter((i) => i.id === itemId) : items,
		expenses,
		year,
	);
	const recurring = detectRecurringItems(items, expenses, year);
	const recurringIds = new Set(recurring.map((r) => r.itemId));

	return summaries.map((s) => {
		const item = items.find((i) => i.id === s.itemId);
		const monthlyTotals = s.months;
		const monthValues = monthlyTotals.map((m) => m.total);

		return {
			itemId: s.itemId,
			itemName: item?.name ?? s.itemId,
			monthlyTotals,
			monthChanges: calcMonthChanges(monthlyTotals, year),
			trend: calcTrend(monthValues),
			anomalies: findAnomalies(monthValues),
			isRecurring: recurringIds.has(s.itemId),
		};
	});
}
