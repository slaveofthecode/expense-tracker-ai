import type { Database } from "bun:sqlite";
import { LEGACY_ITEM_TYPES } from "../types";

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    installments_total INTEGER,
    installments_current INTEGER,
    ownership_percentage REAL NOT NULL,
    ownership_person TEXT
  );
`;

export function runMigrations(db: Database): void {
  db.run(SCHEMA);
  migrateLegacyItemTypes(db);
}

/**
 * Legacy types (loan, recurring, insurance) were removed from the domain.
 * Existing rows are migrated to "other". Idempotent: it is a no-op once no
 * legacy values remain.
 */
function migrateLegacyItemTypes(db: Database): void {
  const placeholders = LEGACY_ITEM_TYPES.map(() => "?").join(", ");
  db.query(
    `UPDATE items SET type = 'other' WHERE type IN (${placeholders})`,
  ).run(...LEGACY_ITEM_TYPES);
}
