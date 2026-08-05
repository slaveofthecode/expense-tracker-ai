import type { Expense, Ownership } from "../types";

interface ExpenseSeed {
  itemId: string;
  description: string;
  amount: number;
  year: number;
  month: number;
  day?: number;
  installments?: { total: number; current: number };
  ownership?: Ownership;
}

let idSeq = 0;

function makeExpense(seed: ExpenseSeed): Expense {
  const {
    itemId,
    description,
    amount,
    year,
    month,
    day = 1,
    installments,
    ownership = { percentage: 100 },
  } = seed;
  return {
    id: `s${idSeq++}`,
    itemId,
    description,
    amount,
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    installments,
    ownership,
  };
}

const LOURDES: Ownership = { percentage: 50, person: "Lourdes" };

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

interface MonthlyDef {
  itemId: string;
  name: (m: string, y: number) => string;
  amount: number;
  day: number;
  ownership?: Ownership;
}

const MONTHLY: MonthlyDef[] = [
  {
    itemId: "alquiler",
    name: (m: string, y: number) => `Alquiler ${m} ${y}`,
    amount: 180000,
    day: 1,
  },
  {
    itemId: "expensas",
    name: (m: string, y: number) => `Expensas ${m} ${y}`,
    amount: 38000,
    day: 5,
    ownership: LOURDES,
  },
  {
    itemId: "obra-social",
    name: (m: string, y: number) => `Obra social ${m} ${y}`,
    amount: 24500,
    day: 1,
  },
  {
    itemId: "monotributo",
    name: (m: string, y: number) => `Monotributo ${m} ${y}`,
    amount: 78000,
    day: 1,
  },
  {
    itemId: "auto-seguro",
    name: (m: string, y: number) => `Seguro auto ${m} ${y}`,
    amount: 22000,
    day: 3,
  },
  {
    itemId: "luz",
    name: (m: string, y: number) => `Luz ${m} ${y}`,
    amount: 14500,
    day: 12,
  },
  {
    itemId: "internet",
    name: (m: string, y: number) => `Internet ${m} ${y}`,
    amount: 13500,
    day: 10,
  },
];

const monthlyExpenses: Expense[] = [];
for (let year = 2025; year <= 2026; year++) {
  for (let month = 1; month <= 12; month++) {
    for (const def of MONTHLY) {
      monthlyExpenses.push(
        makeExpense({
          itemId: def.itemId,
          description: def.name(MESES[month - 1], year),
          amount: def.amount,
          year,
          month,
          day: def.day,
          ownership: def.ownership,
        }),
      );
    }
  }
}

const patentes: Expense[] = [
  { itemId: "auto-rentas", description: "Patente 1er vencimiento", amount: 15500, year: 2025, month: 1, day: 10 },
  { itemId: "auto-rentas", description: "Patente 2do vencimiento", amount: 16000, year: 2025, month: 7, day: 10 },
  { itemId: "auto-rentas", description: "Patente 1er vencimiento", amount: 16500, year: 2026, month: 1, day: 10 },
  { itemId: "auto-rentas", description: "Patente 2do vencimiento", amount: 18000, year: 2026, month: 7, day: 10 },
].map(makeExpense);

const purchases: Expense[] = [
  { itemId: "naranja", description: "Supermercado", amount: 600000, year: 2026, month: 6, day: 5, installments: { total: 3, current: 1 } },
  { itemId: "naranja", description: "Electrodoméstico", amount: 600000, year: 2026, month: 3, day: 12, installments: { total: 6, current: 1 }, ownership: LOURDES },
  { itemId: "naranja", description: "Cena restaurante", amount: 32000, year: 2026, month: 8, day: 20, ownership: LOURDES },
  { itemId: "naranja", description: "Celular Samsung", amount: 2400000, year: 2026, month: 1, day: 18, installments: { total: 12, current: 1 } },
  { itemId: "naranja", description: "Smart TV 55\"", amount: 2400000, year: 2026, month: 1, day: 10, installments: { total: 24, current: 1 } },
  { itemId: "naranja", description: "Heladera", amount: 1800000, year: 2025, month: 7, day: 5, installments: { total: 18, current: 1 }, ownership: LOURDES },
  { itemId: "naranja", description: "Supermercado", amount: 220000, year: 2026, month: 7, day: 15 },
  { itemId: "naranja", description: "Lavarropas", amount: 1200000, year: 2025, month: 9, day: 22, installments: { total: 12, current: 1 } },
  { itemId: "naranja", description: "Farmacia", amount: 24000, year: 2026, month: 4, day: 18 },
  { itemId: "naranja", description: "Notebook", amount: 1200000, year: 2025, month: 3, day: 12, installments: { total: 12, current: 1 } },
  { itemId: "naranja", description: "Bicicleta", amount: 360000, year: 2025, month: 9, day: 1, installments: { total: 6, current: 1 }, ownership: LOURDES },

  { itemId: "santander", description: "Combustible", amount: 75000, year: 2026, month: 8, day: 8 },
  { itemId: "santander", description: "Farmacia", amount: 28500, year: 2026, month: 8, day: 15 },
  { itemId: "santander", description: "Notebook Lenovo", amount: 1800000, year: 2026, month: 3, day: 20, installments: { total: 18, current: 1 } },
  { itemId: "santander", description: "Heladera no frost", amount: 1200000, year: 2025, month: 11, day: 5, installments: { total: 12, current: 1 } },
  { itemId: "santander", description: "Supermercado", amount: 210000, year: 2026, month: 7, day: 18 },
  { itemId: "santander", description: "Indumentaria", amount: 95000, year: 2026, month: 5, day: 30 },
  { itemId: "santander", description: "Celular", amount: 2400000, year: 2025, month: 6, day: 15, installments: { total: 24, current: 1 }, ownership: LOURDES },

  { itemId: "bancor", description: "Supermercado", amount: 96000, year: 2026, month: 8, day: 10, ownership: LOURDES },
  { itemId: "bancor", description: "Electro", amount: 600000, year: 2026, month: 6, day: 25, installments: { total: 3, current: 1 } },
  { itemId: "bancor", description: "Ropa deportiva", amount: 600000, year: 2026, month: 3, day: 25, installments: { total: 6, current: 1 } },
  { itemId: "bancor", description: "Viaje Córdoba", amount: 600000, year: 2025, month: 8, day: 14, installments: { total: 6, current: 1 }, ownership: LOURDES },
  { itemId: "bancor", description: "Gas envasado", amount: 120000, year: 2026, month: 7, day: 8 },

  { itemId: "macro", description: "Comestibles", amount: 130000, year: 2026, month: 8, day: 7 },
  { itemId: "macro", description: "Heladera", amount: 1200000, year: 2025, month: 9, day: 10, installments: { total: 12, current: 1 }, ownership: LOURDES },
  { itemId: "macro", description: "TV", amount: 2400000, year: 2026, month: 1, day: 15, installments: { total: 24, current: 1 } },
  { itemId: "macro", description: "Supermercado", amount: 175000, year: 2026, month: 4, day: 12 },
  { itemId: "macro", description: "Hogar", amount: 145000, year: 2025, month: 10, day: 5 },
].map(makeExpense);

export const expenses: Expense[] = [
  ...monthlyExpenses,
  ...patentes,
  ...purchases,
];
