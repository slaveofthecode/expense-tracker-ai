export const ITEM_TYPES = [
  "credit_card",
  "kids",
  "car",
  "home",
  "other",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  credit_card: "Tarjeta de Crédito",
  kids: "Nenas",
  car: "Auto",
  home: "Depto-Casa",
  other: "Otros",
};

/** Legacy item types kept only for DB migration purposes. */
export const LEGACY_ITEM_TYPES = ["loan", "recurring", "insurance"] as const;

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

export interface NewItem {
  name: string;
  type: ItemType;
}

export interface NewExpense {
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
  | { name: "charts" }
  | { name: "chat" }
  | { name: "itemDetail"; itemId: string; focusExpenseId?: string }
  | { name: "expenseDetail"; expenseId: string; itemId: string }
  | { name: "editItem"; itemId: string }
  | { name: "addExpense"; itemId?: string }
  | { name: "editExpense"; expenseId: string; itemId: string };
