import type { Expense, Item, ItemType } from "../types";

export interface ItemFilters {
  query?: string;
  type?: ItemType;
}

export interface ExpenseFilters {
  query?: string;
  person?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasMatch(haystack: string, query: string): boolean {
  return query.length === 0 || normalize(haystack).includes(query);
}

function expenseMatchesQuery(
  expense: Expense,
  query: string,
  items: Item[] = [],
): boolean {
  const item = items.find((i) => i.id === expense.itemId);
  const haystack = `${expense.description} ${item?.name ?? ""} ${
    expense.ownership.person ?? ""
  }`;
  return hasMatch(haystack, query);
}

export function filterItems(items: Item[], filters: ItemFilters = {}): Item[] {
  const query = normalize(filters.query?.trim() ?? "");
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;
    return hasMatch(item.name, query);
  });
}

export function searchItems(
  items: Item[],
  expenses: Expense[],
  filters: ItemFilters = {},
): Item[] {
  const query = normalize(filters.query?.trim() ?? "");
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;
    if (!query) return true;
    if (normalize(item.name).includes(query)) return true;
    return expenses.some((expense) => {
      return expense.itemId === item.id && expenseMatchesQuery(expense, query);
    });
  });
}

export function filterExpenses(
  expenses: Expense[],
  filters: ExpenseFilters = {},
  items: Item[] = [],
): Expense[] {
  const query = normalize(filters.query?.trim() ?? "");
  const person = normalize(filters.person?.trim() ?? "");
  return expenses.filter((expense) => {
    if (person) {
      const expensePerson = expense.ownership.person;
      if (!expensePerson || normalize(expensePerson) !== person) return false;
    }
    if (query) {
      if (!expenseMatchesQuery(expense, query, items)) return false;
    }
    return true;
  });
}

export interface ExpenseSearchResult {
  kind: "expense";
  itemId: string;
  itemName: string;
  itemType: ItemType;
  expenseId: string;
  description: string;
  amount: number;
  date: string;
  percentage: number;
  person?: string;
}

export interface ItemSearchResult {
  kind: "item";
  itemId: string;
  itemName: string;
  itemType: ItemType;
}

export type SearchResult = ExpenseSearchResult | ItemSearchResult;

export function searchResults(
  items: Item[],
  expenses: Expense[],
  query: string,
): SearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const results: SearchResult[] = [];
  const matchedExpenseIds = new Set<string>();
  for (const expense of expenses) {
    const item = items.find((i) => i.id === expense.itemId);
    if (!item) continue;
    if (expenseMatchesQuery(expense, q, items)) {
      results.push({
        kind: "expense",
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        expenseId: expense.id,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        percentage: expense.ownership.percentage,
        person: expense.ownership.person,
      });
      matchedExpenseIds.add(expense.id);
    }
  }
  for (const item of items) {
    if (!hasMatch(item.name, q)) continue;
    const hasExpenseMatch = expenses.some(
      (e) => e.itemId === item.id && matchedExpenseIds.has(e.id),
    );
    if (!hasExpenseMatch) {
      results.push({
        kind: "item",
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
      });
    }
  }
  results.sort((a, b) => {
    if (a.kind === "item" && b.kind !== "item") return 1;
    if (a.kind !== "item" && b.kind === "item") return -1;
    if (a.kind === "expense" && b.kind === "expense") {
      return b.date.localeCompare(a.date);
    }
    return a.itemName.localeCompare(b.itemName);
  });
  return results;
}
