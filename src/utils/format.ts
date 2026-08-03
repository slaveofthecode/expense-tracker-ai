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

export function myShare(amount: number, percentage: number): number {
  return (amount * percentage) / 100;
}

export function ownershipLabel(percentage: number, person?: string): string {
  if (percentage === 100) return "100% me";
  if (person) return `${percentage}% (${person})`;
  return `${percentage}%`;
}
