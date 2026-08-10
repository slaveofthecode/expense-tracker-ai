import { describe, it, expect } from "bun:test";
import { filterItems, filterExpenses, searchItems, searchResults } from "./filters";
import type { Item, Expense } from "../types";

const items: Item[] = [
  { id: "alquiler", name: "Alquiler", type: "recurring" },
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
  { id: "auto-seguro", name: "Seguro Auto", type: "insurance" },
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

describe("filterItems", () => {
  it("returns all items without filters", () => {
    expect(filterItems(items)).toHaveLength(items.length);
  });

  it("matches name case-insensitively", () => {
    const result = filterItems(items, { query: "ALQUILER" });
    expect(result.map((i) => i.id)).toEqual(["alquiler"]);
  });

  it("matches name accent-insensitively", () => {
    const result = filterItems(items, { query: "cafe" });
    expect(result.map((i) => i.id)).toEqual(["cafe"]);
  });

  it("filters by type", () => {
    const result = filterItems(items, { type: "credit_card" });
    expect(result.map((i) => i.id)).toEqual(["naranja"]);
  });

  it("combines query and type", () => {
    const result = filterItems(items, { query: "auto", type: "insurance" });
    expect(result.map((i) => i.id)).toEqual(["auto-seguro"]);
  });

  it("returns empty when query matches nothing", () => {
    expect(filterItems(items, { query: "inexistente" })).toHaveLength(0);
  });

  it("trims surrounding whitespace from the query", () => {
    const result = filterItems(items, { query: "  naranja  " });
    expect(result.map((i) => i.id)).toEqual(["naranja"]);
  });

  it("returns all items for a whitespace-only query", () => {
    expect(filterItems(items, { query: "   " })).toHaveLength(items.length);
  });

  it("returns all items for empty filters object", () => {
    expect(filterItems(items, {})).toHaveLength(items.length);
  });

  it("returns empty when no item has the filtered type", () => {
    const result = filterItems(items, { type: "loan" });
    expect(result).toHaveLength(0);
  });
});

describe("searchItems", () => {
  it("returns all items without a query", () => {
    expect(searchItems(items, expenses)).toHaveLength(items.length);
  });

  it("matches the item name", () => {
    const result = searchItems(items, expenses, { query: "alquiler" });
    expect(result.map((i) => i.id)).toEqual(["alquiler"]);
  });

  it("matches an expense description of the item", () => {
    const result = searchItems(items, expenses, { query: "supermercado" });
    expect(result.map((i) => i.id)).toEqual(["naranja"]);
  });

  it("matches a person sharing an expense", () => {
    const result = searchItems(items, expenses, { query: "lourdes" });
    expect(result.map((i) => i.id)).toEqual(["naranja"]);
  });

  it("combines query and type filters", () => {
    const result = searchItems(items, expenses, {
      query: "supermercado",
      type: "credit_card",
    });
    expect(result.map((i) => i.id)).toEqual(["naranja"]);
  });

  it("matches an item without expenses by name", () => {
    const result = searchItems(items, expenses, { query: "cafe" });
    expect(result.map((i) => i.id)).toEqual(["cafe"]);
  });

  it("filters by type only without a query", () => {
    const result = searchItems(items, expenses, { type: "insurance" });
    expect(result.map((i) => i.id)).toEqual(["auto-seguro"]);
  });

  it("matches accent-insensitive expense descriptions", () => {
    const result = searchItems(items, expenses, { query: "poliza" });
    expect(result.map((i) => i.id)).toEqual(["auto-seguro"]);
  });

  it("ignores expenses with an orphan itemId", () => {
    const orphan: Expense = {
      ...expenses[1],
      id: "9",
      itemId: "no-existe",
    };
    const result = searchItems(items, [...expenses, orphan], {
      query: "supermercado",
    });
    expect(result.map((i) => i.id)).toEqual(["naranja"]);
  });

  it("returns empty when nothing matches", () => {
    const result = searchItems(items, expenses, { query: "inexistente" });
    expect(result).toHaveLength(0);
  });
});

describe("filterExpenses", () => {
  it("returns all expenses without filters", () => {
    expect(filterExpenses(expenses)).toHaveLength(expenses.length);
  });

  it("matches description case-insensitively", () => {
    const result = filterExpenses(expenses, { query: "SUPER" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("matches item name via the item list", () => {
    const result = filterExpenses(expenses, { query: "naranja" }, items);
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("matches ownership person in the query", () => {
    const result = filterExpenses(expenses, { query: "lourdes" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("filters by exact person", () => {
    const result = filterExpenses(expenses, { person: "Lourdes" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("does not match a partial person with the person filter", () => {
    const result = filterExpenses(expenses, { person: "lour" });
    expect(result).toHaveLength(0);
  });

  it("filters by person accent-insensitively", () => {
    const accented: Expense = {
      ...expenses[1],
      id: "4",
      ownership: { percentage: 50, person: "Jose" },
    };
    const result = filterExpenses([...expenses, accented], { person: "José" });
    expect(result.map((e) => e.id)).toEqual(["4"]);
  });

  it("combines query and person filters", () => {
    const result = filterExpenses(
      expenses,
      { query: "supermercado", person: "Lourdes" },
      items,
    );
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("returns empty when query matches nothing", () => {
    expect(filterExpenses(expenses, { query: "inexistente" })).toHaveLength(0);
  });

  it("trims surrounding whitespace from the query", () => {
    const result = filterExpenses(expenses, { query: "  super  " });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("returns all expenses for a whitespace-only query", () => {
    expect(filterExpenses(expenses, { query: "   " })).toHaveLength(
      expenses.length,
    );
  });

  it("returns all expenses for empty filters object", () => {
    expect(filterExpenses(expenses, {})).toHaveLength(expenses.length);
  });

  it("excludes expenses without a person when filtering by person", () => {
    const result = filterExpenses(expenses, { person: "Lourdes" });
    expect(result.every((e) => e.ownership.person === "Lourdes")).toBe(true);
  });
});

describe("searchResults", () => {
  it("returns an empty list for an empty query", () => {
    expect(searchResults(items, expenses, "")).toHaveLength(0);
    expect(searchResults(items, expenses, "   ")).toHaveLength(0);
  });

  it("matches an expense by description", () => {
    const result = searchResults(items, expenses, "supermercado");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "expense",
      itemId: "naranja",
      expenseId: "2",
      description: "Supermercado",
    });
  });

  it("matches an expense by person", () => {
    const result = searchResults(items, expenses, "lourdes");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: "expense", itemId: "naranja" });
  });

  it("matches an expense by item name", () => {
    const result = searchResults(items, expenses, "seguro");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "expense",
      itemId: "auto-seguro",
      description: "Póliza semestral",
    });
  });

  it("includes the ownership percentage and person", () => {
    const result = searchResults(items, expenses, "supermercado");
    expect(result[0]).toMatchObject({
      kind: "expense",
      percentage: 50,
      person: "Lourdes",
    });
  });

  it("adds an item row when the item matches by name without expenses", () => {
    const result = searchResults(items, expenses, "cafe");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: "item", itemId: "cafe" });
  });

  it("does not duplicate an item row when its expenses already match", () => {
    const result = searchResults(items, expenses, "naranja");
    expect(result.filter((r) => r.kind === "item")).toHaveLength(0);
    expect(result.every((r) => r.kind === "expense")).toBe(true);
  });

  it("sorts expense results by date descending", () => {
    const extra: Expense = {
      ...expenses[2],
      id: "8",
      description: "Supermercado",
      date: "2026-05-10",
    };
    const result = searchResults(items, [...expenses, extra], "supermercado");
    const dates = result
      .filter((r) => r.kind === "expense")
      .map((r) => r.date);
    expect(dates).toEqual(["2026-06-05", "2026-05-10"]);
  });

  it("places item-only rows after expense rows", () => {
    const extra: Item = { id: "expensas", name: "Expensas", type: "recurring" };
    const result = searchResults([...items, extra], expenses, "a");
    const kinds = result.map((r) => r.kind);
    const lastItemKind = kinds.lastIndexOf("item");
    const firstExpenseKind = kinds.indexOf("expense");
    if (firstExpenseKind !== -1) {
      expect(lastItemKind).toBeLessThan(kinds.length);
      expect(lastItemKind).toBeGreaterThan(firstExpenseKind);
    }
  });

  it("matches accent-insensitively", () => {
    const result = searchResults(items, expenses, "poliza");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: "expense", itemId: "auto-seguro" });
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchResults(items, expenses, "inexistente")).toHaveLength(0);
  });

  it("ignores expenses with an orphan itemId", () => {
    const orphan: Expense = {
      ...expenses[0],
      id: "99",
      itemId: "no-existe",
      description: "Supermercado",
    };
    const result = searchResults(items, [...expenses, orphan], "supermercado");
    const expenseIds = result
      .filter((r) => r.kind === "expense")
      .map((r) => r.expenseId);
    expect(expenseIds).toEqual(["2"]);
  });
});
