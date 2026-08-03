import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { ITEM_TYPES } from "../types";
import type { Expense, Item, ItemType, NewExpense, NewItem } from "../types";

interface ItemRow {
  id: string;
  name: string;
  type: string;
}

interface ExpenseRow {
  id: string;
  item_id: string;
  description: string;
  amount: number;
  date: string;
  installments_total: number | null;
  installments_current: number | null;
  ownership_percentage: number;
  ownership_person: string | null;
}

const INSERT_EXPENSE_SQL = `
  INSERT INTO expenses (
    id, item_id, description, amount, date,
    installments_total, installments_current,
    ownership_percentage, ownership_person
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function isItemType(value: string): value is ItemType {
  return (ITEM_TYPES as readonly string[]).includes(value);
}

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    type: isItemType(row.type) ? row.type : "other",
  };
}

function mapExpense(row: ExpenseRow): Expense {
  const installments =
    row.installments_total !== null && row.installments_current !== null
      ? { total: row.installments_total, current: row.installments_current }
      : undefined;

  return {
    id: row.id,
    itemId: row.item_id,
    description: row.description,
    amount: row.amount,
    date: row.date,
    installments,
    ownership: {
      percentage: row.ownership_percentage,
      person: row.ownership_person ?? undefined,
    },
  };
}

function installmentsParams(input: NewExpense): [number | null, number | null] {
  return [input.installments?.total ?? null, input.installments?.current ?? null];
}

export function listItems(db: Database): Item[] {
  const rows = db
    .query("SELECT id, name, type FROM items ORDER BY rowid")
    .all() as ItemRow[];
  return rows.map(mapItem);
}

export function listExpenses(db: Database): Expense[] {
  const rows = db
    .query("SELECT * FROM expenses ORDER BY date, rowid")
    .all() as ExpenseRow[];
  return rows.map(mapExpense);
}

export function createItem(db: Database, input: NewItem): Item {
  const id = randomUUID();
  db.query("INSERT INTO items (id, name, type) VALUES (?, ?, ?)").run(
    id,
    input.name,
    input.type,
  );
  return { id, ...input };
}

export function updateItem(db: Database, id: string, input: NewItem): void {
  const result = db
    .query("UPDATE items SET name = ?, type = ? WHERE id = ?")
    .run(input.name, input.type, id);
  if (result.changes === 0) {
    throw new Error(`Item ${id} not found`);
  }
}

export function deleteItem(db: Database, id: string): void {
  const result = db.query("DELETE FROM items WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw new Error(`Item ${id} not found`);
  }
}

export function createExpense(db: Database, input: NewExpense): Expense {
  const id = randomUUID();
  const [installmentsTotal, installmentsCurrent] = installmentsParams(input);
  db.query(INSERT_EXPENSE_SQL).run(
    id,
    input.itemId,
    input.description,
    input.amount,
    input.date,
    installmentsTotal,
    installmentsCurrent,
    input.ownership.percentage,
    input.ownership.person ?? null,
  );
  return { id, ...input };
}

export function updateExpense(db: Database, id: string, input: NewExpense): void {
  const [installmentsTotal, installmentsCurrent] = installmentsParams(input);
  const result = db.query(`
    UPDATE expenses SET
      item_id = ?, description = ?, amount = ?, date = ?,
      installments_total = ?, installments_current = ?,
      ownership_percentage = ?, ownership_person = ?
    WHERE id = ?
  `).run(
    input.itemId,
    input.description,
    input.amount,
    input.date,
    installmentsTotal,
    installmentsCurrent,
    input.ownership.percentage,
    input.ownership.person ?? null,
    id,
  );
  if (result.changes === 0) {
    throw new Error(`Expense ${id} not found`);
  }
}

export function deleteExpense(db: Database, id: string): void {
  const result = db.query("DELETE FROM expenses WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw new Error(`Expense ${id} not found`);
  }
}
