import type { Expense } from "../types";
import { monthOf } from "./summaries";

export interface DetailRow {
  key: string;
  description: string;
  badge: string;
  monthlyAmount: number;
  isShared: boolean;
  /** Month index (0-11) rendered as first installment, if any. */
  firstInstallmentMonth: number | null;
  coveredMonths: Set<number>;
  /** Member expense ids sorted by date; [0] is the Enter-navigation target. */
  expenseIds: string[];
}

interface Coverage {
  startYear: number;
  startMonth: number;
  window: number;
}

interface DraftRow {
  row: DetailRow;
  members: { id: string; date: string }[];
}

function coverageOf(expense: Expense): Coverage {
  const startYear = Number(monthOf(expense.date).slice(0, 4));
  const startMonth = Number(monthOf(expense.date).slice(5, 7)) - 1;
  const window = expense.installments?.total ?? 1;
  return { startYear, startMonth, window };
}

function coveredMonthsInYear(coverage: Coverage, year: number): Set<number> {
  const covered = new Set<number>();
  for (let k = 0; k < coverage.window; k++) {
    const absolute = coverage.startMonth + k;
    if (coverage.startYear + Math.floor(absolute / 12) !== year) continue;
    covered.add(absolute % 12);
  }
  return covered;
}

/**
 * Builds the yearly grid rows of an item detail screen. Expenses created
 * through fixed-months expansion share description, amount and ownership,
 * so they merge into a single row whose cells span every covered month
 * instead of showing one raw record per line. Installment records always
 * get their own row.
 */
export function buildDetailRows(expenses: Expense[], year: number): DetailRow[] {
  const drafts: DraftRow[] = [];
  const draftIndexByKey = new Map<string, number>();

  for (const expense of expenses) {
    const coverage = coverageOf(expense);
    const covered = coveredMonthsInYear(coverage, year);
    if (covered.size === 0) continue;

    if (expense.installments) {
      drafts.push({
        row: {
          key: expense.id,
          description: expense.description.trim(),
          badge: ` en ${expense.installments.total} ctas`,
          monthlyAmount: Math.round(expense.amount / expense.installments.total),
          isShared: expense.ownership.percentage < 100,
          firstInstallmentMonth:
            coverage.startYear === year ? coverage.startMonth : null,
          coveredMonths: covered,
          expenseIds: [],
        },
        members: [{ id: expense.id, date: expense.date }],
      });
      continue;
    }

    const key = [
      expense.description.trim(),
      expense.amount,
      expense.ownership.percentage,
      expense.ownership.person ?? "",
    ].join("\u0000");

    const existingIndex = draftIndexByKey.get(key);
    if (existingIndex !== undefined) {
      const draft = drafts[existingIndex];
      for (const month of covered) draft.row.coveredMonths.add(month);
      draft.members.push({ id: expense.id, date: expense.date });
      continue;
    }

    draftIndexByKey.set(key, drafts.length);
    drafts.push({
      row: {
        key,
        description: expense.description.trim(),
        badge: "",
        monthlyAmount: expense.amount,
        isShared: expense.ownership.percentage < 100,
        firstInstallmentMonth: null,
        coveredMonths: covered,
        expenseIds: [],
      },
      members: [{ id: expense.id, date: expense.date }],
    });
  }

  return drafts.map(({ row, members }) => ({
    ...row,
    expenseIds: [...members]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((member) => member.id),
  }));
}

/** Index of the row containing the given expense, or -1 when absent. */
export function findRowContaining(rows: DetailRow[], expenseId: string): number {
  return rows.findIndex((row) => row.expenseIds.includes(expenseId));
}
