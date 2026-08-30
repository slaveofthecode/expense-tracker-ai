import { describe, it, expect } from "bun:test";
import type { Item, Expense } from "../types";
import type { SearchResult } from "../utils/filters";
import { buildTools, getTool } from "./tools";

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

function context() {
  return {
    listItems: () => items,
    listExpenses: () => expenses,
  };
}

function run<T = unknown>(toolName: string, args: Record<string, unknown> = {}): T {
  const tool = getTool(buildTools(context()), toolName);
  expect(tool).toBeDefined();
  return tool!.execute(args) as T;
}

describe("registry", () => {
  it("exposes the seven read-only tools", () => {
    const tools = buildTools(context());
    expect(tools.map((t) => t.name)).toEqual([
      "list_items",
      "list_expenses",
      "get_monthly_summary",
      "get_yearly_summary",
      "search_expenses",
      "analyze_patterns",
      "get_recommendations",
    ]);
  });

  it("marks every tool as read-only", () => {
    for (const tool of buildTools(context())) {
      expect(tool.readonly).toBe(true);
    }
  });

  it("describes each tool and its parameters", () => {
    for (const tool of buildTools(context())) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(Array.isArray(tool.parameters)).toBe(true);
    }
  });

  it("getTool finds tools by name and returns undefined otherwise", () => {
    const tools = buildTools(context());
    expect(getTool(tools, "list_items")?.name).toBe("list_items");
    expect(getTool(tools, "write_to_db")).toBeUndefined();
  });
});

describe("list_items", () => {
  it("returns all items", () => {
    expect(run("list_items")).toHaveLength(4);
  });

  it("filters by type", () => {
    const result = run("list_items", { type: "credit_card" }) as Item[];
    expect(result.map((i) => i.id)).toEqual(["naranja"]);
  });
});

describe("list_expenses", () => {
  it("returns all expenses", () => {
    expect(run("list_expenses")).toHaveLength(3);
  });

  it("filters by year", () => {
    expect(run("list_expenses", { year: 2026 })).toHaveLength(3);
    expect(run("list_expenses", { year: 2025 })).toHaveLength(0);
  });

  it("filters by itemId", () => {
    const result = run("list_expenses", { itemId: "naranja" }) as Expense[];
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });
});

describe("get_monthly_summary", () => {
  it("returns per-item totals for the month", () => {
    const result = run("get_monthly_summary", { month: "2026-06" }) as {
      itemId: string;
      totalAmount: number;
      myShare: number;
    }[];
    const naranja = result.find((r) => r.itemId === "naranja");
    expect(naranja).toBeDefined();
    expect(naranja!.totalAmount).toBe(60000);
    expect(naranja!.myShare).toBe(30000);
  });

  it("defaults to the current month when omitted", () => {
    const result = run("get_monthly_summary") as unknown[];
    expect(result).toHaveLength(items.length);
  });

  it("throws on an invalid month format", () => {
    expect(() => run("get_monthly_summary", { month: "marzo" })).toThrow(
      /Invalid month/,
    );
  });
});

describe("get_yearly_summary", () => {
  it("prorates installments across the 12 months", () => {
    const withInstallment = context();
    const allExpenses = [
      ...expenses,
      {
        id: "4",
        itemId: "naranja",
        description: "Notebook 12 cuotas",
        amount: 120000,
        date: "2026-01-10",
        installments: { total: 12, current: 1 },
        ownership: { percentage: 100 },
      },
    ];
    const tool = getTool(buildTools({ ...withInstallment, listExpenses: () => allExpenses }), "get_yearly_summary");
    expect(tool).toBeDefined();
    const result = tool!.execute({ year: 2026 }) as {
      itemId: string;
      months: { total: number }[];
    }[];
    const naranja = result.find((r) => r.itemId === "naranja");
    expect(naranja).toBeDefined();
    expect(naranja!.months[0].total).toBe(10000);
    expect(naranja!.months[11].total).toBe(10000);
    expect(naranja!.months[5].total).toBe(70000);
  });

  it("defaults to the latest year with data when omitted", () => {
    const result = run("get_yearly_summary") as { itemId: string }[];
    expect(result).toHaveLength(items.length);
  });
});

describe("search_expenses", () => {
  it("matches expenses by description", () => {
    const result = run<SearchResult[]>("search_expenses", { query: "super" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: "expense", expenseId: "2" });
  });

  it("matches expenses by person", () => {
    const result = run<SearchResult[]>("search_expenses", { query: "lourdes" });
    expect(result[0]).toMatchObject({ kind: "expense", expenseId: "2" });
  });

  it("includes item rows for items matched without expenses", () => {
    const result = run<SearchResult[]>("search_expenses", { query: "cafe" });
    expect(result[0]).toMatchObject({ kind: "item", itemId: "cafe" });
  });

  it("throws when query is missing", () => {
    expect(() => run("search_expenses")).toThrow(/Missing required argument/);
  });
});

describe("create_expense", () => {
  function writeContext() {
    const createdItems: Item[] = [];
    const createdExpenses: Expense[] = [];
    const writer = {
      ...context(),
      createItem: (input: { name: string; type: Item["type"] }) => {
        const item: Item = { id: `new-${createdItems.length + 1}`, ...input };
        createdItems.push(item);
        return item;
      },
      createExpense: (input: Omit<Expense, "id">) => {
        const expense: Expense = {
          id: `exp-${createdExpenses.length + 1}`,
          ...input,
        };
        createdExpenses.push(expense);
        return expense;
      },
    };
    return { writer, createdItems, createdExpenses };
  }

  it("is not exposed without a write context", () => {
    expect(getTool(buildTools(context()), "create_expense")).toBeUndefined();
  });

  it("is exposed with a write context and marked as non-read-only", () => {
    const { writer } = writeContext();
    const tool = getTool(buildTools(writer), "create_expense");
    expect(tool).toBeDefined();
    expect(tool!.readonly).toBe(false);
  });

  it("creates an expense inside an existing item", () => {
    const { writer, createdExpenses } = writeContext();
    const tool = getTool(buildTools(writer), "create_expense")!;
    const result = tool.execute({
      itemName: "tarjeta naranja",
      description: "zapatillas",
      amount: 120000,
    }) as { item: Item; expense: Expense };
    expect(result.item.id).toBe("naranja");
    expect(createdExpenses).toHaveLength(1);
    expect(createdExpenses[0]).toMatchObject({
      itemId: "naranja",
      description: "zapatillas",
      amount: 120000,
      ownership: { percentage: 100 },
    });
  });

  it("auto-creates a new item with the type inferred from the description", () => {
    const { writer, createdItems } = writeContext();
    const tool = getTool(buildTools(writer), "create_expense")!;
    const result = tool.execute({
      itemName: "expensas edificio",
      description: "expensas",
      amount: 50000,
    }) as { item: Item; expense: Expense };
    expect(result.item.name).toBe("Expensas Edificio");
    expect(result.item.type).toBe("home");
    expect(createdItems).toHaveLength(1);
  });

  it("honors explicit itemType, installments and ownership for new items", () => {
    const { writer, createdItems, createdExpenses } = writeContext();
    const tool = getTool(buildTools(writer), "create_expense")!;
    tool.execute({
      itemName: "bici",
      description: "bicicleta",
      amount: "1.500.000",
      itemType: "credit_card",
      installmentsTotal: 6,
      ownershipPercentage: 50,
      ownershipPerson: "Gus",
    });
    expect(createdItems[0].type).toBe("credit_card");
    expect(createdExpenses[0]).toMatchObject({
      amount: 1500000,
      installments: { total: 6, current: 1 },
      ownership: { percentage: 50, person: "Gus" },
    });
  });

  it("validates required arguments and amounts", () => {
    const { writer } = writeContext();
    const tool = getTool(buildTools(writer), "create_expense")!;
    expect(() => tool.execute({ description: "x", amount: 100 })).toThrow(
      /itemName/,
    );
    expect(() => tool.execute({ itemName: "x", amount: 100 })).toThrow(
      /description/,
    );
    expect(() => tool.execute({ itemName: "x", description: "y" })).toThrow(
      /amount/,
    );
    expect(() =>
      tool.execute({ itemName: "x", description: "y", amount: -5 }),
    ).toThrow(/amount/);
  });
});
