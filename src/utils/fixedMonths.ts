import type { NewExpense } from "../types";
import { MONTHS_SHORT_ES } from "./format";

export const MAX_FIXED_MONTHS = 24;

function addMonthsKeepDay(iso: string, k: number): string {
  const year = Number(iso.slice(0, 4));
  const monthIndex = Number(iso.slice(5, 7)) - 1;
  const day = Number(iso.slice(8, 10));
  const absolute = monthIndex + k;
  const nextYear = year + Math.floor(absolute / 12);
  const nextMonthIndex = absolute % 12;
  const daysInMonth = new Date(
    Date.UTC(nextYear, nextMonthIndex + 1, 0),
  ).getUTCDate();
  const nextDay = Math.min(day, daysInMonth);
  return `${String(nextYear).padStart(4, "0")}-${String(
    nextMonthIndex + 1,
  ).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
}

/**
 * Expands a base expense into `months` identical records, one per
 * consecutive calendar month, keeping the day of the base date (clamped
 * to the last day of shorter months: Jan 31 -> Feb 28).
 */
export function expandFixedMonths(
  base: NewExpense,
  months: number,
): NewExpense[] {
  if (!Number.isInteger(months) || months < 1 || months > MAX_FIXED_MONTHS) {
    throw new Error(
      `Vigencia debe ser un entero entre 1 y ${MAX_FIXED_MONTHS}`,
    );
  }
  if (base.installments) {
    throw new Error("Vigencia y cuotas son excluyentes");
  }
  return Array.from({ length: months }, (_, k) => ({
    ...base,
    date: addMonthsKeepDay(base.date, k),
  }));
}

/** Human summary for the form preview: "Se crearán 4 registros: ago 2026 – nov 2026". */
export function fixedMonthsPreview(dateIso: string, months: number): string {
  const first = addMonthsKeepDay(dateIso, 0);
  const last = addMonthsKeepDay(dateIso, months - 1);
  const label = (iso: string) =>
    `${MONTHS_SHORT_ES[Number(iso.slice(5, 7)) - 1].toLowerCase()} ${iso.slice(0, 4)}`;
  return `Se crearán ${months} registros: ${label(first)} – ${label(last)}`;
}
