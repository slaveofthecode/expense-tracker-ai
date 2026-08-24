import { describe, it, expect } from "bun:test";
import { generateRecommendations } from "./recommendations";
import type { Item, Expense } from "../types";

const makeItem = (id: string, name: string, type: Item["type"] = "home"): Item => ({
	id,
	name,
	type,
});

const makeExpense = (
	itemId: string,
	amount: number,
	year: number,
	month: number,
): Expense => ({
	id: `e-${itemId}-${year}-${month}`,
	itemId,
	description: `Gasto ${month}`,
	amount,
	date: `${year}-${String(month).padStart(2, "0")}-01`,
	ownership: { percentage: 100 },
});

describe("generateRecommendations", () => {
	it("returns empty for no data", () => {
		expect(generateRecommendations([], [], 2026)).toEqual([]);
	});

	it("detects spending increase", () => {
		const items = [makeItem("a", "Alquiler")];
		const expenses = [
			makeExpense("a", 100000, 2026, 1),
			makeExpense("a", 100000, 2026, 2),
			makeExpense("a", 100000, 2026, 3),
			makeExpense("a", 100000, 2026, 4),
			makeExpense("a", 100000, 2026, 5),
			makeExpense("a", 100000, 2026, 6),
			makeExpense("a", 100000, 2026, 7),
			makeExpense("a", 100000, 2026, 8),
			makeExpense("a", 100000, 2026, 9),
			makeExpense("a", 100000, 2026, 10),
			makeExpense("a", 100000, 2026, 11),
			makeExpense("a", 150000, 2026, 12),
		];
		const recs = generateRecommendations(items, expenses, 2026);
		expect(recs.some((r) => r.type === "spending_increase")).toBe(true);
	});

	it("detects spending decrease", () => {
		const items = [makeItem("a", "Alquiler")];
		const expenses = [
			makeExpense("a", 100000, 2026, 1),
			makeExpense("a", 100000, 2026, 2),
			makeExpense("a", 100000, 2026, 3),
			makeExpense("a", 100000, 2026, 4),
			makeExpense("a", 100000, 2026, 5),
			makeExpense("a", 100000, 2026, 6),
			makeExpense("a", 100000, 2026, 7),
			makeExpense("a", 100000, 2026, 8),
			makeExpense("a", 100000, 2026, 9),
			makeExpense("a", 100000, 2026, 10),
			makeExpense("a", 100000, 2026, 11),
			makeExpense("a", 50000, 2026, 12),
		];
		const recs = generateRecommendations(items, expenses, 2026);
		expect(recs.some((r) => r.type === "spending_decrease")).toBe(true);
	});

	it("detects category spike", () => {
		const items = [makeItem("a", "Supermercado")];
		const expenses = [
			makeExpense("a", 50000, 2026, 1),
			makeExpense("a", 50000, 2026, 2),
			makeExpense("a", 50000, 2026, 3),
			makeExpense("a", 50000, 2026, 4),
			makeExpense("a", 50000, 2026, 5),
			makeExpense("a", 50000, 2026, 6),
			makeExpense("a", 50000, 2026, 7),
			makeExpense("a", 50000, 2026, 8),
			makeExpense("a", 50000, 2026, 9),
			makeExpense("a", 50000, 2026, 10),
			makeExpense("a", 50000, 2026, 11),
			makeExpense("a", 150000, 2026, 12),
		];
		const recs = generateRecommendations(items, expenses, 2026);
		expect(recs.some((r) => r.type === "category_spike")).toBe(true);
	});

	it("detects recurring items", () => {
		const items = [makeItem("a", "Internet")];
		const expenses = [
			makeExpense("a", 10000, 2026, 1),
			makeExpense("a", 10000, 2026, 2),
			makeExpense("a", 10000, 2026, 3),
			makeExpense("a", 10000, 2026, 4),
			makeExpense("a", 10000, 2026, 5),
			makeExpense("a", 10000, 2026, 6),
		];
		const recs = generateRecommendations(items, expenses, 2026);
		expect(recs.some((r) => r.type === "new_recurring")).toBe(true);
	});

	it("detects top cost driver", () => {
		const items = [
			makeItem("a", "Alquiler"),
			makeItem("b", "Internet"),
		];
		const expenses = [
			makeExpense("a", 500000, 2026, 1),
			makeExpense("a", 500000, 2026, 2),
			makeExpense("a", 500000, 2026, 3),
			makeExpense("a", 500000, 2026, 4),
			makeExpense("a", 500000, 2026, 5),
			makeExpense("a", 500000, 2026, 6),
			makeExpense("a", 500000, 2026, 7),
			makeExpense("a", 500000, 2026, 8),
			makeExpense("a", 500000, 2026, 9),
			makeExpense("a", 500000, 2026, 10),
			makeExpense("a", 500000, 2026, 11),
			makeExpense("a", 500000, 2026, 12),
			makeExpense("b", 10000, 2026, 1),
			makeExpense("b", 10000, 2026, 2),
			makeExpense("b", 10000, 2026, 3),
			makeExpense("b", 10000, 2026, 4),
			makeExpense("b", 10000, 2026, 5),
			makeExpense("b", 10000, 2026, 6),
			makeExpense("b", 10000, 2026, 7),
			makeExpense("b", 10000, 2026, 8),
			makeExpense("b", 10000, 2026, 9),
			makeExpense("b", 10000, 2026, 10),
			makeExpense("b", 10000, 2026, 11),
			makeExpense("b", 10000, 2026, 12),
		];
		const recs = generateRecommendations(items, expenses, 2026);
		expect(recs.some((r) => r.type === "top_cost_driver")).toBe(true);
	});

	it("filters by itemId when provided", () => {
		const items = [
			makeItem("a", "Alquiler"),
			makeItem("b", "Internet"),
		];
		const expenses = [
			makeExpense("a", 100000, 2026, 1),
			makeExpense("a", 100000, 2026, 2),
			makeExpense("a", 100000, 2026, 3),
			makeExpense("a", 100000, 2026, 4),
			makeExpense("a", 100000, 2026, 5),
			makeExpense("a", 100000, 2026, 6),
			makeExpense("a", 150000, 2026, 7),
			makeExpense("a", 100000, 2026, 8),
			makeExpense("a", 100000, 2026, 9),
			makeExpense("a", 100000, 2026, 10),
			makeExpense("a", 100000, 2026, 11),
			makeExpense("a", 100000, 2026, 12),
			makeExpense("b", 10000, 2026, 1),
			makeExpense("b", 10000, 2026, 2),
			makeExpense("b", 10000, 2026, 3),
			makeExpense("b", 10000, 2026, 4),
			makeExpense("b", 10000, 2026, 5),
			makeExpense("b", 10000, 2026, 6),
			makeExpense("b", 10000, 2026, 7),
			makeExpense("b", 10000, 2026, 8),
			makeExpense("b", 10000, 2026, 9),
			makeExpense("b", 10000, 2026, 10),
			makeExpense("b", 10000, 2026, 11),
			makeExpense("b", 10000, 2026, 12),
		];
		const recs = generateRecommendations(items, expenses, 2026, "b");
		expect(recs.every((r) => r.itemId === "b")).toBe(true);
	});

	it("sorts by severity", () => {
		const items = [makeItem("a", "Alquiler")];
		const expenses = [
			makeExpense("a", 100000, 2026, 1),
			makeExpense("a", 100000, 2026, 2),
			makeExpense("a", 100000, 2026, 3),
			makeExpense("a", 100000, 2026, 4),
			makeExpense("a", 100000, 2026, 5),
			makeExpense("a", 100000, 2026, 6),
			makeExpense("a", 100000, 2026, 7),
			makeExpense("a", 100000, 2026, 8),
			makeExpense("a", 100000, 2026, 9),
			makeExpense("a", 100000, 2026, 10),
			makeExpense("a", 100000, 2026, 11),
			makeExpense("a", 100000, 2026, 12),
		];
		const recs = generateRecommendations(items, expenses, 2026);
		const severityOrder = { high: 0, medium: 1, low: 2 };
		for (let i = 1; i < recs.length; i++) {
			expect(severityOrder[recs[i].severity]).toBeGreaterThanOrEqual(
				severityOrder[recs[i - 1].severity],
			);
		}
	});
});
