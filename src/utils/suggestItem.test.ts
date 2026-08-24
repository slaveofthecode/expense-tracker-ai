import { describe, it, expect } from "bun:test";
import { suggestItem, parseSuggestionAnswer } from "./suggestItem";
import type { Item, Expense } from "../types";

const items: Item[] = [
  { id: "alquiler", name: "Alquiler", type: "home" },
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
  { id: "auto-seguro", name: "Seguro Auto", type: "car" },
  { id: "auto-rentas", name: "Auto Rentas", type: "home" },
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
    itemId: "auto-rentas",
    description: "Patente 1er vencimiento",
    amount: 15500,
    date: "2026-01-10",
    ownership: { percentage: 100 },
  },
];

describe("suggestItem", () => {
  it("suggests the item when the description equals its name", () => {
    const suggestion = suggestItem(items, expenses, "Alquiler");
    expect(suggestion).toBeDefined();
    expect(suggestion?.itemId).toBe("alquiler");
    expect(suggestion?.source).toBe("name");
    expect(suggestion?.score).toBe(1);
  });

  it("suggests the item when the description matches a previous expense", () => {
    const suggestion = suggestItem(items, expenses, "Patente 1er vencimiento");
    expect(suggestion).toBeDefined();
    expect(suggestion?.itemId).toBe("auto-rentas");
    expect(suggestion?.source).toBe("history");
    expect(suggestion?.score).toBe(1);
  });

  it("matches historical descriptions case-insensitively", () => {
    const suggestion = suggestItem(items, expenses, "patente 1ER VENCIMIENTO");
    expect(suggestion?.itemId).toBe("auto-rentas");
  });

  it("matches item names ignoring accents", () => {
    const suggestion = suggestItem(items, expenses, "cafe");
    expect(suggestion).toBeDefined();
    expect(suggestion?.itemId).toBe("cafe");
    expect(suggestion?.source).toBe("name");
  });

  it("suggests when description is contained in the item name", () => {
    const suggestion = suggestItem(items, expenses, "Naranja");
    expect(suggestion).toBeDefined();
    expect(suggestion?.itemId).toBe("naranja");
    expect(suggestion?.source).toBe("name");
    expect(suggestion?.score).toBe(0.8);
  });

  it("suggests a partial historical match through token overlap", () => {
    const suggestion = suggestItem(items, expenses, "Patente 2do vencimiento");
    expect(suggestion).toBeDefined();
    expect(suggestion?.itemId).toBe("auto-rentas");
    expect(suggestion?.source).toBe("history");
  });

  it("returns undefined for an empty description", () => {
    expect(suggestItem(items, expenses, "")).toBeUndefined();
    expect(suggestItem(items, expenses, "   ")).toBeUndefined();
  });

  it("returns undefined when nothing matches strongly", () => {
    expect(suggestItem(items, expenses, "Gasto totalmente nuevo")).toBeUndefined();
  });

  it("picks the strongest match over a weak one", () => {
    const mixedItems: Item[] = [
      ...items,
      { id: "otro", name: "Otros Gastos", type: "other" },
    ];
    const suggestion = suggestItem(mixedItems, expenses, "Alquiler");
    expect(suggestion?.itemId).toBe("alquiler");
  });
});

describe("parseSuggestionAnswer", () => {
  it("parses an item name embedded in a sentence", () => {
    const suggestion = parseSuggestionAnswer(
      "Lo agregaría a Depto-Casa — Alquiler",
      items,
    );
    expect(suggestion).toBeDefined();
    expect(suggestion?.itemId).toBe("alquiler");
  });

  it("parses the item name case-insensitively", () => {
    const suggestion = parseSuggestionAnswer("ALQUILER", items);
    expect(suggestion?.itemId).toBe("alquiler");
  });

  it("parses ignoring accents", () => {
    const suggestion = parseSuggestionAnswer("Te sugiero el ítem Cafe", items);
    expect(suggestion?.itemId).toBe("cafe");
  });

  it("returns undefined when no item name appears", () => {
    expect(parseSuggestionAnswer("No sé a qué ítem va", items)).toBeUndefined();
  });

  it("returns undefined for an empty answer", () => {
    expect(parseSuggestionAnswer("", items)).toBeUndefined();
  });
});
