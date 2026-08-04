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
