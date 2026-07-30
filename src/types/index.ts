export type ItemType = "credit_card" | "loan" | "recurring" | "insurance" | "other";

export interface Item {
  id: string;
  name: string;
  type: ItemType;
}

export interface Installment {
  total: number;
  current: number;
}

export interface Ownership {
  percentage: number;
  person?: string;
}

export interface Expense {
  id: string;
  itemId: string;
  description: string;
  amount: number;
  date: string;
  installments?: Installment;
  ownership: Ownership;
}

export interface MonthlySummary {
  itemId: string;
  month: string;
  totalAmount: number;
  myShare: number;
}

export type Screen =
  | { name: "dashboard" }
  | { name: "itemDetail"; itemId: string }
  | { name: "expenseDetail"; expenseId: string; itemId: string };
