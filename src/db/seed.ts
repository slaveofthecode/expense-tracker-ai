import type { Database } from "bun:sqlite";
import { items as seedItems } from "../data/items";
import { expenses as seedExpenses } from "../data/expenses";

const INSERT_ITEM_SQL = "INSERT INTO items (id, name, type) VALUES (?, ?, ?)";

const INSERT_EXPENSE_SQL = `
  INSERT INTO expenses (
    id, item_id, description, amount, date,
    installments_total, installments_current,
    ownership_percentage, ownership_person
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export function seedIfEmpty(db: Database): void {
  const { count } = db
    .query("SELECT COUNT(*) AS count FROM items")
    .get() as { count: number };
  if (count > 0) {
    return;
  }

  const insertItem = db.query(INSERT_ITEM_SQL);
  for (const item of seedItems) {
    insertItem.run(item.id, item.name, item.type);
  }

  const insertExpense = db.query(INSERT_EXPENSE_SQL);
  for (const expense of seedExpenses) {
    insertExpense.run(
      expense.id,
      expense.itemId,
      expense.description,
      expense.amount,
      expense.date,
      expense.installments?.total ?? null,
      expense.installments?.current ?? null,
      expense.ownership.percentage,
      expense.ownership.person ?? null,
    );
  }
}
