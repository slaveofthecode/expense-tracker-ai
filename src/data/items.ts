import type { Item } from "../types";

export const items: Item[] = [
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
  { id: "santander", name: "Tarjeta Santander Visa", type: "credit_card" },
  { id: "bancor", name: "Tarjeta Bancor Master", type: "credit_card" },
  { id: "alquiler", name: "Alquiler", type: "recurring" },
  { id: "expensas", name: "Expensas", type: "recurring" },
  { id: "obra-social", name: "Obra Social", type: "recurring" },
  { id: "monotributo", name: "Monotributo", type: "recurring" },
  { id: "auto-seguro", name: "Auto Seguro", type: "insurance" },
  { id: "auto-rentas", name: "Auto Rentas", type: "recurring" },
];
