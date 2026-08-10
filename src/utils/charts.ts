import type { Expense, Item, ItemType } from "../types";
import { ITEM_TYPES, ITEM_TYPE_LABELS } from "../types";
import { calcYearlySummaries, type YearlySummary } from "./summaries";
import { formatCurrency } from "./format";

export interface MonthlyTotalRow {
  total: number;
  myShare: number;
}

export interface YearlyBar {
  label: string;
  value: number;
  percentage: number;
}

export interface TypeYearlyBar extends YearlyBar {
  type: ItemType;
}

export interface ChartsData {
  monthly: MonthlyTotalRow[];
  byType: TypeYearlyBar[];
  top: YearlyBar[];
}

export function computeCharts(
  items: Item[],
  expenses: Expense[],
  year: number,
): ChartsData {
  const summaries = calcYearlySummaries(items, expenses, year);
  const monthly: MonthlyTotalRow[] = Array.from({ length: 12 }, () => ({
    total: 0,
    myShare: 0,
  }));
  for (const summary of summaries) {
    summary.months.forEach((m, i) => {
      monthly[i].total += m.total;
      monthly[i].myShare += m.myShare;
    });
  }
  return {
    monthly,
    byType: totalsByType(items, summaries),
    top: topItems(items, summaries),
  };
}

export function totalsByType(
  items: Item[],
  summaries: YearlySummary[],
): TypeYearlyBar[] {
  const totals = new Map<ItemType, number>();
  for (const summary of summaries) {
    const item = items.find((i) => i.id === summary.itemId);
    if (!item) continue;
    totals.set(item.type, (totals.get(item.type) ?? 0) + yearlyValue(summary));
  }
  const grand = sum(totals.values());
  return ITEM_TYPES.map((type) => ({
    type,
    label: ITEM_TYPE_LABELS[type],
    value: totals.get(type) ?? 0,
    percentage: grand > 0 ? (totals.get(type) ?? 0) / grand : 0,
  }))
    .filter((bar) => bar.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function topItems(
  items: Item[],
  summaries: YearlySummary[],
  limit = 5,
): YearlyBar[] {
  const rows = summaries
    .map((summary) => {
      const item = items.find((i) => i.id === summary.itemId);
      return { label: item?.name ?? "?", value: yearlyValue(summary) };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
  const grand = sum(rows.map((row) => row.value));
  return rows.map((row) => ({
    ...row,
    percentage: grand > 0 ? row.value / grand : 0,
  }));
}

function yearlyValue(summary: YearlySummary): number {
  return summary.months.reduce((acc, month) => acc + month.total, 0);
}

function sum(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function scaleBlocks(value: number, max: number, width: number): number {
  if (width <= 0 || max <= 0) return 0;
  return Math.round((value / max) * width);
}

export function scaleBlocksMin(
  value: number,
  max: number,
  width: number,
  min = 1,
): number {
  const blocks = scaleBlocks(value, max, width);
  if (value > 0 && max > 0 && width > 0 && blocks < min) return min;
  return blocks;
}

export function barString(
  blocks: number,
  width: number,
  filled = "█",
  empty = "░",
): string {
  const fill = Math.max(0, Math.min(blocks, width));
  return filled.repeat(fill) + empty.repeat(width - fill);
}

export function distributeSegments(values: number[], width: number): number[] {
  if (width <= 0) return values.map(() => 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const floors = values.map((value) =>
    Math.floor((value / total) * width),
  );
  const fractions = floors.map((floor, i) => ({
    i,
    frac: (values[i] / total) * width - floor,
  }));
  let remaining = width - floors.reduce((a, b) => a + b, 0);
  fractions.sort((a, b) => b.frac - a.frac);
  for (let k = 0; remaining > 0; k++, remaining--) {
    floors[fractions[k % fractions.length].i] += 1;
  }
  const nonZero = values
    .map((value, i) => (value > 0 ? i : -1))
    .filter((i) => i >= 0);
  if (nonZero.length > 0 && nonZero.length <= width) {
    for (const i of nonZero) {
      if (floors[i] === 0) {
        const biggest = nonZero.reduce((best, j) =>
          floors[j] > floors[best] ? j : best,
        );
        floors[biggest] -= 1;
        floors[i] += 1;
      }
    }
  }
  return floors;
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return value / total;
}

export function annotation(value: number, percentage: number): string {
  return `${formatCurrency(value)}  ${Math.round(percentage * 100)}%`;
}
