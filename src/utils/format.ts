export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatMonth(month: string): string {
  const d = new Date(month + "-01T00:00:00");
  return d.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const MONTHS_SHORT_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function myShare(amount: number, percentage: number): number {
  return (amount * percentage) / 100;
}

export function ownershipLabel(percentage: number, person?: string): string {
  if (percentage === 100) return "100% yo";
  if (person) return `${percentage}% (${person})`;
  return `${percentage}%`;
}

export function formatYearWide(year: number): string {
  return String(year)
    .split("")
    .map((char) => String.fromCharCode(0xff10 + Number(char)))
    .join("");
}

/**
 * Parse a currency string (supports es-AR and en-US styles) into a number.
 * Examples:
 *  "$1.234,56"    => 1234.56 (es-AR)
 *  "1.200.000"    => 1200000 (es-AR, dot as thousands separator)
 *  "1,234.56"     => 1234.56 (en-US)
 *  "1,234,567"    => 1234567 (en-US, comma as thousands separator)
 *  "1234"         => 1234
 */
const DOTS_THOUSANDS_RE = /^-?\d{1,3}(\.\d{3})+$/;
const COMMAS_THOUSANDS_RE = /^-?\d{1,3}(,\d{3})+$/;

export function parseCurrency(input: string): number {
  if (!input) return NaN;
  const s = String(input).trim();
  // remove currency symbol and spaces
  const cleaned = s.replace(/[^0-9.,-]/g, "");
  if (cleaned === "") return NaN;
  const hasDot = cleaned.indexOf(".") !== -1;
  const hasComma = cleaned.indexOf(",") !== -1;

  let normalized = cleaned;
  if (hasDot && hasComma) {
    // the rightmost separator is the decimal one (es-AR vs en-US)
    if (cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",")) {
      normalized = cleaned.replace(/,/g, "");
    } else {
      normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (DOTS_THOUSANDS_RE.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  } else if (COMMAS_THOUSANDS_RE.test(cleaned)) {
    normalized = cleaned.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    // assume comma is decimal
    normalized = cleaned.replace(/,/g, ".");
  } else {
    // only dots or only digits - treat dot as decimal
    // remove any extra non-digit except dot
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}
