import type { Item, Expense } from "../types";
import {
	buildPatternData,
	type PatternData,
	type MonthChange,
} from "./patterns";
import { calcYearlySummaries } from "./summaries";

export type RecommendationSeverity = "high" | "medium" | "low";

export interface Recommendation {
	type: "spending_increase" | "spending_decrease" | "category_spike" | "new_recurring" | "top_cost_driver";
	severity: RecommendationSeverity;
	itemId: string;
	itemName: string;
	summary: string;
	data: Record<string, number | string>;
}

const INCREASE_THRESHOLD = 15;
const SPIKE_MULTIPLIER = 2;
const TOP_COST_THRESHOLD = 0.4;
const MIN_RECURRING_MONTHS = 3;

function detectSpendingIncrease(patterns: PatternData[]): Recommendation[] {
	const recs: Recommendation[] = [];
	for (const p of patterns) {
		const recent = p.monthChanges.filter(
			(c) => c.previous > 0 && c.percentChange !== null,
		);
		const last = recent[recent.length - 1];
		if (!last || last.percentChange === null) continue;

		if (last.percentChange > INCREASE_THRESHOLD) {
			recs.push({
				type: "spending_increase",
				severity: last.percentChange > 30 ? "high" : "medium",
				itemId: p.itemId,
				itemName: p.itemName,
				summary: `${p.itemName} subió ${last.percentChange}% respecto al mes anterior`,
				data: {
					previousMonth: last.previous,
					currentMonth: last.current,
					percentChange: last.percentChange,
				},
			});
		}
	}
	return recs;
}

function detectSpendingDecrease(patterns: PatternData[]): Recommendation[] {
	const recs: Recommendation[] = [];
	for (const p of patterns) {
		const recent = p.monthChanges.filter(
			(c) => c.previous > 0 && c.percentChange !== null,
		);
		const last = recent[recent.length - 1];
		if (!last || last.percentChange === null) continue;

		if (last.percentChange < -INCREASE_THRESHOLD) {
			recs.push({
				type: "spending_decrease",
				severity: "low",
				itemId: p.itemId,
				itemName: p.itemName,
				summary: `${p.itemName} bajó ${Math.abs(last.percentChange)}% respecto al mes anterior`,
				data: {
					previousMonth: last.previous,
					currentMonth: last.current,
					percentChange: last.percentChange,
				},
			});
		}
	}
	return recs;
}

function detectCategorySpikes(patterns: PatternData[]): Recommendation[] {
	const recs: Recommendation[] = [];
	for (const p of patterns) {
		const activeMonths = p.monthChanges.filter((c) => c.current > 0);
		if (activeMonths.length < 4) continue;

		const values = activeMonths.map((c) => c.current);
		const recent = values[values.length - 1];
		const historical = values.slice(0, -1);
		const avg = historical.reduce((a, b) => a + b, 0) / historical.length;

		if (avg > 0 && recent > avg * SPIKE_MULTIPLIER) {
			recs.push({
				type: "category_spike",
				severity: "high",
				itemId: p.itemId,
				itemName: p.itemName,
				summary: `${p.itemName} tuvo un pico: $${recent.toLocaleString("es-AR")} vs promedio $${Math.round(avg).toLocaleString("es-AR")}`,
				data: {
					currentMonth: recent,
					averageMonths: Math.round(avg),
					multiplier: Math.round((recent / avg) * 100) / 100,
				},
			});
		}
	}
	return recs;
}

function detectNewRecurring(patterns: PatternData[]): Recommendation[] {
	return patterns
		.filter((p) => p.isRecurring)
		.map((p) => ({
			type: "new_recurring" as const,
			severity: "low" as const,
			itemId: p.itemId,
			itemName: p.itemName,
			summary: `${p.itemName} es un gasto recurrente (${p.trend.direction === "stable" ? "estable" : p.trend.direction === "up" ? "en aumento" : "a la baja"})`,
			data: {
				trendDirection: p.trend.direction,
				trendSlope: p.trend.slope,
			},
		}));
}

function detectTopCostDriver(
	patterns: PatternData[],
	year: number,
): Recommendation[] {
	const totals = patterns.map((p) => ({
		itemId: p.itemId,
		itemName: p.itemName,
		total: p.monthChanges.reduce((sum, c) => sum + c.current, 0),
	}));

	const grandTotal = totals.reduce((sum, t) => sum + t.total, 0);
	if (grandTotal === 0) return [];

	return totals
		.filter((t) => t.total / grandTotal > TOP_COST_THRESHOLD)
		.map((t) => ({
			type: "top_cost_driver" as const,
			severity: "medium" as const,
			itemId: t.itemId,
			itemName: t.itemName,
			summary: `${t.itemName} representa ${Math.round((t.total / grandTotal) * 100)}% del total del año`,
			data: {
				total: Math.round(t.total),
				percentOfTotal: Math.round((t.total / grandTotal) * 100),
			},
		}));
}

export function generateRecommendations(
	items: Item[],
	expenses: Expense[],
	year: number,
	itemId?: string,
): Recommendation[] {
	const patterns = buildPatternData(items, expenses, year, itemId);

	const allRecs: Recommendation[] = [
		...detectSpendingIncrease(patterns),
		...detectSpendingDecrease(patterns),
		...detectCategorySpikes(patterns),
		...detectNewRecurring(patterns),
		...detectTopCostDriver(patterns, year),
	];

	const severityOrder: Record<RecommendationSeverity, number> = {
		high: 0,
		medium: 1,
		low: 2,
	};

	return allRecs.sort(
		(a, b) => severityOrder[a.severity] - severityOrder[b.severity],
	);
}
