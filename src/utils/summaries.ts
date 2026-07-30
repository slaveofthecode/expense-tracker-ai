import type { Item, Expense, MonthlySummary } from "../types";

export function calcMonthlySummaries(
  items: Item[],
  expenses: Expense[],
): MonthlySummary[] {
  return items.map((item) => {
    const itemExpenses = expenses.filter((e) => e.itemId === item.id);
    const totalAmount = itemExpenses.reduce((sum, e) => sum + e.amount, 0);
    const myShare = itemExpenses.reduce(
      (sum, e) => sum + (e.amount * e.ownership.percentage) / 100,
      0,
    );
    return {
      itemId: item.id,
      month: "2026-07",
      totalAmount,
      myShare,
    };
  });
}
