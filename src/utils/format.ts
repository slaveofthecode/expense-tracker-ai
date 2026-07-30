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

export function myShare(amount: number, percentage: number): number {
  return (amount * percentage) / 100;
}

export function ownershipLabel(percentage: number, person?: string): string {
  if (percentage === 100) return "100% me";
  if (person) return `${percentage}% (${person})`;
  return `${percentage}%`;
}
