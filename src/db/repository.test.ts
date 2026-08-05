import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations } from "./schema";
import { seedIfEmpty } from "./seed";
import { items as seedItems } from "../data/items";
import { expenses as seedExpenses } from "../data/expenses";
import {
  listItems,
  listExpenses,
  createItem,
  updateItem,
  deleteItem,
  createExpense,
  updateExpense,
  deleteExpense,
} from "./repository";
import type { NewExpense } from "../types";

let db: Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = ON;");
  runMigrations(db);
});

describe("schema", () => {
  it("creates items and expenses tables", () => {
    const tables = db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('items', 'expenses')",
      )
      .all();
    expect(tables).toHaveLength(2);
  });
});

describe("seedIfEmpty", () => {
  it("inserts mock data on an empty database", () => {
    seedIfEmpty(db);
    expect(listItems(db)).toHaveLength(seedItems.length);
    expect(listExpenses(db)).toHaveLength(seedExpenses.length);
  });

  it("does not duplicate data when called twice", () => {
    seedIfEmpty(db);
    seedIfEmpty(db);
    expect(listItems(db)).toHaveLength(seedItems.length);
    expect(listExpenses(db)).toHaveLength(seedExpenses.length);
  });
});

describe("items CRUD", () => {
  it("creates and lists an item", () => {
    const item = createItem(db, { name: "Netflix", type: "recurring" });
    const found = listItems(db).find((i) => i.id === item.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Netflix");
    expect(found!.type).toBe("recurring");
  });

  it("updates an item", () => {
    const item = createItem(db, { name: "Netflix", type: "recurring" });
    updateItem(db, item.id, { name: "Spotify", type: "recurring" });
    const found = listItems(db).find((i) => i.id === item.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Spotify");
  });

  it("deletes an item and cascades its expenses", () => {
    const item = createItem(db, { name: "Netflix", type: "recurring" });
    createExpense(db, {
      itemId: item.id,
      description: "Plan",
      amount: 1000,
      date: "2026-08-01",
      ownership: { percentage: 100 },
    });
    deleteItem(db, item.id);
    expect(listItems(db)).toHaveLength(0);
    expect(listExpenses(db)).toHaveLength(0);
  });

  it("throws when updating a missing item", () => {
    expect(() =>
      updateItem(db, "nope", { name: "X", type: "other" }),
    ).toThrow();
  });

  it("throws when deleting a missing item", () => {
    expect(() => deleteItem(db, "nope")).toThrow();
  });
});

describe("expenses CRUD", () => {
  const baseExpense = (itemId: string): NewExpense => ({
    itemId,
    description: "TV",
    amount: 120000,
    date: "2026-08-10",
    ownership: { percentage: 100 },
  });

  it("creates and reads an expense with installments and ownership", () => {
    const item = createItem(db, { name: "Card", type: "credit_card" });
    const expense = createExpense(db, {
      ...baseExpense(item.id),
      installments: { total: 12, current: 1 },
      ownership: { percentage: 50, person: "Lourdes" },
    });
    const found = listExpenses(db).find((e) => e.id === expense.id);
    expect(found).toBeDefined();
    expect(found!.installments).toEqual({ total: 12, current: 1 });
    expect(found!.ownership).toEqual({ percentage: 50, person: "Lourdes" });
  });

  it("reads an expense without installments or person", () => {
    const item = createItem(db, { name: "Card", type: "credit_card" });
    const expense = createExpense(db, baseExpense(item.id));
    const found = listExpenses(db).find((e) => e.id === expense.id);
    expect(found).toBeDefined();
    expect(found!.installments).toBeUndefined();
    expect(found!.ownership.person).toBeUndefined();
  });

  it("updates an expense", () => {
    const item = createItem(db, { name: "Card", type: "credit_card" });
    const expense = createExpense(db, baseExpense(item.id));
    updateExpense(db, expense.id, {
      itemId: item.id,
      description: "TV 55",
      amount: 130000,
      date: "2026-08-11",
      ownership: { percentage: 100 },
    });
    const found = listExpenses(db).find((e) => e.id === expense.id);
    expect(found).toBeDefined();
    expect(found!.description).toBe("TV 55");
    expect(found!.amount).toBe(130000);
    expect(found!.date).toBe("2026-08-11");
  });

  it("deletes an expense", () => {
    const item = createItem(db, { name: "Card", type: "credit_card" });
    const expense = createExpense(db, baseExpense(item.id));
    deleteExpense(db, expense.id);
    expect(listExpenses(db)).toHaveLength(0);
  });

  it("throws when creating an expense for a missing item", () => {
    expect(() => createExpense(db, baseExpense("nope"))).toThrow();
  });

  it("throws when updating a missing expense", () => {
    const item = createItem(db, { name: "Card", type: "credit_card" });
    expect(() => updateExpense(db, "nope", baseExpense(item.id))).toThrow();
  });
});
