import type { Item, Expense, MonthlySummary } from "../types";

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function getLatestMonth(expenses: Expense[]): string | undefined {
  const months = expenses.map((e) => monthOf(e.date)).sort();
  return months.length > 0 ? months[months.length - 1] : undefined;
}

export function currentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function calcMonthlySummaries(
  items: Item[],
  expenses: Expense[],
  month: string,
): MonthlySummary[] {
  const monthly = expenses.filter((e) => monthOf(e.date) === month);

  return items.map((item) => {
    const itemExpenses = monthly.filter((e) => e.itemId === item.id);
    const totalAmount = itemExpenses.reduce((sum, e) => sum + e.amount, 0);
    const myShare = itemExpenses.reduce(
      (sum, e) => sum + (e.amount * e.ownership.percentage) / 100,
      0,
    );
    return {
      itemId: item.id,
      month,
      totalAmount,
      myShare,
    };
  });
}
