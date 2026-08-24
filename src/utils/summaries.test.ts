import { describe, it, expect } from "bun:test";
import {
  calcMonthlySummaries,
  calcYearlySummaries,
  currentMonth,
  getLatestMonth,
  getLatestYear,
  monthOf,
} from "./summaries";
import type { Item, Expense } from "../types";

const items: Item[] = [
  { id: "a", name: "Item A", type: "home" },
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

describe("getLatestYear", () => {
  it("returns the most recent year present", () => {
    const withLater = [
      ...expenses,
      {
        id: "4",
        itemId: "a",
        description: "Later",
        amount: 1,
        date: "2027-01-01",
        ownership: { percentage: 100 },
      },
    ];
    expect(getLatestYear(withLater)).toBe(2027);
  });

  it("returns undefined when there are no expenses", () => {
    expect(getLatestYear([])).toBeUndefined();
  });
});

describe("calcYearlySummaries", () => {
  it("returns one summary per item with 12 months", () => {
    const result = calcYearlySummaries(items, expenses, 2026);
    expect(result).toHaveLength(2);
    for (const summary of result) {
      expect(summary.months).toHaveLength(12);
    }
  });

  it("aggregates total and myShare per month", () => {
    const result = calcYearlySummaries(items, expenses, 2026);

    const itemA = result.find((s) => s.itemId === "a");
    expect(itemA).toBeDefined();
    expect(itemA!.months[6]).toEqual({ total: 1500, myShare: 1250 });

    const itemB = result.find((s) => s.itemId === "b");
    expect(itemB).toBeDefined();
    expect(itemB!.months[6]).toEqual({ total: 2000, myShare: 2000 });
  });

  it("ignores expenses from other years", () => {
    const mixed: Expense[] = [
      ...expenses,
      {
        id: "4",
        itemId: "a",
        description: "Next year",
        amount: 9999,
        date: "2027-01-01",
        ownership: { percentage: 100 },
      },
    ];
    const result = calcYearlySummaries(items, mixed, 2026);
    const itemA = result.find((s) => s.itemId === "a");
    expect(itemA).toBeDefined();
    expect(itemA!.months[6].total).toBe(1500);
    expect(itemA!.months[0].total).toBe(0);
  });

  it("returns zeros for items without expenses", () => {
    const result = calcYearlySummaries([items[0]], [], 2026);
    expect(
      result[0].months.every((m) => m.total === 0 && m.myShare === 0),
    ).toBe(true);
  });
});

describe("calcYearlySummaries with installments", () => {
  const cardItem: Item[] = [
    { id: "a", name: "Item A", type: "credit_card" },
  ];
  const sixInstallments: Expense[] = [
    {
      id: "c1",
      itemId: "a",
      description: "Compra 6 cuotas",
      amount: 6000,
      date: "2026-03-10",
      installments: { total: 6, current: 1 },
      ownership: { percentage: 100 },
    },
  ];

  it("distributes amount/total from the purchase month onwards", () => {
    const result = calcYearlySummaries(cardItem, sixInstallments, 2026);
    const months = result[0].months;
    expect(months[2]).toEqual({ total: 1000, myShare: 1000 }); // Marzo
    expect(months[3]).toEqual({ total: 1000, myShare: 1000 }); // Abril
    expect(months[4]).toEqual({ total: 1000, myShare: 1000 }); // Mayo
    expect(months[5]).toEqual({ total: 1000, myShare: 1000 }); // Junio
    expect(months[6]).toEqual({ total: 1000, myShare: 1000 }); // Julio
    expect(months[7]).toEqual({ total: 1000, myShare: 1000 }); // Agosto
    expect(months[0]).toEqual({ total: 0, myShare: 0 }); // Enero
    expect(months[8]).toEqual({ total: 0, myShare: 0 }); // Septiembre
  });

  it("spreads myShare for shared ownership", () => {
    const shared: Expense[] = [
      { ...sixInstallments[0], ownership: { percentage: 50, person: "Lourdes" } },
    ];
    const result = calcYearlySummaries(cardItem, shared, 2026);
    expect(result[0].months[2]).toEqual({ total: 1000, myShare: 500 });
  });

  it("carries installments across years", () => {
    const twelve: Expense[] = [
      {
        id: "c2",
        itemId: "a",
        description: "12 cuotas",
        amount: 120000,
        date: "2025-11-15",
        installments: { total: 12, current: 1 },
        ownership: { percentage: 100 },
      },
    ];
    const in2025 = calcYearlySummaries(cardItem, twelve, 2025);
    expect(in2025[0].months[10]).toEqual({ total: 10000, myShare: 10000 });
    expect(in2025[0].months[11]).toEqual({ total: 10000, myShare: 10000 });
    const in2026 = calcYearlySummaries(cardItem, twelve, 2026);
    expect(in2026[0].months[0]).toEqual({ total: 10000, myShare: 10000 });
    expect(in2026[0].months[9]).toEqual({ total: 10000, myShare: 10000 });
    expect(in2026[0].months[10]).toEqual({ total: 0, myShare: 0 });
  });

  it("rounds the monthly installment amount", () => {
    const odd: Expense[] = [
      {
        id: "c3",
        itemId: "a",
        description: "3 cuotas",
        amount: 10000,
        date: "2026-03-10",
        installments: { total: 3, current: 1 },
        ownership: { percentage: 100 },
      },
    ];
    const result = calcYearlySummaries(cardItem, odd, 2026);
    expect(result[0].months[2]).toEqual({ total: 3333, myShare: 3333 });
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

  it("distributes installments into the covered months", () => {
    const cardItem: Item[] = [
      { id: "a", name: "Item A", type: "credit_card" },
    ];
    const installments: Expense[] = [
      {
        id: "c1",
        itemId: "a",
        description: "Compra 6 cuotas",
        amount: 6000,
        date: "2026-03-10",
        installments: { total: 6, current: 1 },
        ownership: { percentage: 100 },
      },
    ];
    const inApril = calcMonthlySummaries(cardItem, installments, "2026-04");
    expect(inApril[0].totalAmount).toBe(1000);
    const after = calcMonthlySummaries(cardItem, installments, "2026-10");
    expect(after[0].totalAmount).toBe(0);
  });
});
