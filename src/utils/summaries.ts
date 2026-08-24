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

export function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  if (
    !/^\d{4}-\d{2}$/.test(month) ||
    !Number.isInteger(year) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new Error(`Invalid month "${month}", expected format YYYY-MM`);
  }
  const absolute = year * 12 + monthIndex + delta;
  const nextYear = Math.floor(absolute / 12);
  const nextMonthIndex = absolute % 12;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonthIndex + 1).padStart(2, "0")}`;
}

export interface MonthlyTotal {
  total: number;
  myShare: number;
}

export interface YearlySummary {
  itemId: string;
  months: MonthlyTotal[];
}

export function getLatestYear(expenses: Expense[]): number | undefined {
  if (expenses.length === 0) return undefined;
  return Math.max(...expenses.map((e) => Number(monthOf(e.date).slice(0, 4))));
}

function installmentAmount(expense: Expense): number {
  if (!expense.installments || expense.installments.total <= 1) {
    return expense.amount;
  }
  return Math.round(expense.amount / expense.installments.total);
}

function installmentWindow(expense: Expense): number {
  return expense.installments?.total ?? 1;
}

export function calcYearlySummaries(
  items: Item[],
  expenses: Expense[],
  year: number,
): YearlySummary[] {
  return items.map((item) => {
    const months = Array.from({ length: 12 }, () => ({ total: 0, myShare: 0 }));
    for (const expense of expenses) {
      if (expense.itemId !== item.id) continue;
      const amount = installmentAmount(expense);
      const startYear = Number(monthOf(expense.date).slice(0, 4));
      const startMonth = Number(monthOf(expense.date).slice(5, 7)) - 1;
      const window = installmentWindow(expense);
      for (let k = 0; k < window; k++) {
        const absolute = startMonth + k;
        if (startYear + Math.floor(absolute / 12) !== year) continue;
        const monthIndex = absolute % 12;
        months[monthIndex].total += amount;
        months[monthIndex].myShare +=
          (amount * expense.ownership.percentage) / 100;
      }
    }
    return { itemId: item.id, months };
  });
}

export function calcMonthlySummaries(
  items: Item[],
  expenses: Expense[],
  month: string,
): MonthlySummary[] {
  const year = Number(month.slice(0, 4));
  const targetIndex = Number(month.slice(5, 7)) - 1;

  return items.map((item) => {
    let totalAmount = 0;
    let myShare = 0;
    for (const expense of expenses) {
      if (expense.itemId !== item.id) continue;
      const amount = installmentAmount(expense);
      const startYear = Number(monthOf(expense.date).slice(0, 4));
      const startMonth = Number(monthOf(expense.date).slice(5, 7)) - 1;
      const window = installmentWindow(expense);
      for (let k = 0; k < window; k++) {
        const absolute = startMonth + k;
        if (startYear + Math.floor(absolute / 12) !== year) continue;
        if (absolute % 12 !== targetIndex) continue;
        totalAmount += amount;
        myShare += (amount * expense.ownership.percentage) / 100;
      }
    }
    return {
      itemId: item.id,
      month,
      totalAmount,
      myShare,
    };
  });
}
