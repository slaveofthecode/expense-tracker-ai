import { describe, it, expect } from "bun:test";
import {
  calcMonthlySummaries,
  currentMonth,
  getLatestMonth,
  monthOf,
} from "./summaries";
import type { Item, Expense } from "../types";

const items: Item[] = [
  { id: "a", name: "Item A", type: "recurring" },
  { id: "b", name: "Item B", type: "credit_card" },
];

const expenses: Expense[] = [
  {
    id: "1",
    itemId: "a",
    description: "Expense 1",
    amount: 1000,
    date: "2026-07-01",
    ownership: { percentage: 100 },
  },
  {
    id: "2",
    itemId: "a",
    description: "Expense 2",
    amount: 500,
    date: "2026-07-05",
    ownership: { percentage: 50, person: "Lourdes" },
  },
  {
    id: "3",
    itemId: "b",
    description: "Expense 3",
    amount: 2000,
    date: "2026-07-10",
    ownership: { percentage: 100 },
  },
];

describe("monthOf", () => {
  it("extracts YYYY-MM from an ISO date", () => {
    expect(monthOf("2026-07-05")).toBe("2026-07");
  });
});

describe("getLatestMonth", () => {
  it("returns the most recent month present", () => {
    const withLater = [
      ...expenses,
      {
        id: "4",
        itemId: "a",
        description: "Later",
        amount: 1,
        date: "2026-09-01",
        ownership: { percentage: 100 },
      },
    ];
    expect(getLatestMonth(withLater)).toBe("2026-09");
  });

  it("returns undefined when there are no expenses", () => {
    expect(getLatestMonth([])).toBeUndefined();
  });
});

describe("currentMonth", () => {
  it("formats as YYYY-MM", () => {
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("calcMonthlySummaries", () => {
  it("returns one summary per item", () => {
    const result = calcMonthlySummaries(items, expenses, "2026-07");
    expect(result).toHaveLength(2);
  });

  it("calculates total and myShare for each item", () => {
    const result = calcMonthlySummaries(items, expenses, "2026-07");

    const itemA = result.find((s) => s.itemId === "a");
    expect(itemA).toBeDefined();
    expect(itemA!.totalAmount).toBe(1500);
    expect(itemA!.myShare).toBe(1250);

    const itemB = result.find((s) => s.itemId === "b");
    expect(itemB).toBeDefined();
    expect(itemB!.totalAmount).toBe(2000);
    expect(itemB!.myShare).toBe(2000);
  });

  it("returns 0 for items without expenses", () => {
    const result = calcMonthlySummaries([items[0]], [], "2026-07");
    expect(result[0].totalAmount).toBe(0);
    expect(result[0].myShare).toBe(0);
  });

  it("sets month correctly", () => {
    const result = calcMonthlySummaries(items, expenses, "2026-07");
    expect(result[0].month).toBe("2026-07");
  });

  it("filters expenses from other months", () => {
    const mixed: Expense[] = [
      ...expenses,
      {
        id: "4",
        itemId: "a",
        description: "Next month",
        amount: 9999,
        date: "2026-08-01",
        ownership: { percentage: 100 },
      },
    ];
    const result = calcMonthlySummaries(items, mixed, "2026-07");
    const itemA = result.find((s) => s.itemId === "a");
    expect(itemA).toBeDefined();
    expect(itemA!.totalAmount).toBe(1500);
  });
});
